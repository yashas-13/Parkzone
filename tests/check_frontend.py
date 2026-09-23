#!/usr/bin/env python3
"""Static integrity checks for the ParkZone front-end.

Catches the class of mistakes that only show up in a browser otherwise:
  * HTML that is not well formed / unclosed tags
  * a class used in markup that the design system never defines (silent unstyled UI)
  * broken internal links, missing pages and missing assets
  * CSP violations: inline <script>, on* handlers, style="", <style> blocks, CDNs
  * missing SEO/social metadata or accessibility basics

    python3 tests/check_frontend.py
"""
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
ASSETS = os.path.join(PUBLIC, "assets")
CSS_FILES = [os.path.join(ASSETS, "pz.css"), os.path.join(ASSETS, "fonts.css")]
JS_FILES = [os.path.join(ASSETS, f) for f in sorted(os.listdir(ASSETS)) if f.endswith(".js")]

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
CLEAN_URLS = {
    "/": "index.html", "/host": "host.html", "/dashboard": "dashboard.html",
    "/status": "status.html", "/terms": "terms.html", "/privacy": "privacy.html",
    "/refund": "refund.html",
}
REQUIRED_META = ["description", "viewport", "theme-color", "og:title", "og:description", "og:image", "og:url", "twitter:card"]
problems = []
warnings = []


def rel(path):
    return os.path.relpath(path, ROOT)


class Doc(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.stack = []
        self.classes = []
        self.refs = []          # local href/src targets
        self.external = []
        self.inline_handlers = []
        self.inline_styles = []
        self.style_blocks = 0
        self.inline_scripts = []
        self.metas = {}
        self.links = []
        self.h1 = 0
        self.has_main = False
        self.imgs_missing_alt = 0
        self.unlabelled_inputs = 0
        self.buttons_without_type = 0
        self.labels_for = set()
        self.input_ids = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if tag == "main":
            self.has_main = True
        if tag == "h1":
            self.h1 += 1
        if tag == "style":
            self.style_blocks += 1
        if tag == "img" and not a.get("alt"):
            self.imgs_missing_alt += 1
        if tag == "button" and not a.get("type"):
            self.buttons_without_type += 1
        if tag == "label" and a.get("for"):
            self.labels_for.add(a["for"])
        if tag in ("input", "select", "textarea"):
            if a.get("id"):
                self.input_ids.append(a["id"])
            if not (a.get("id") or a.get("aria-label") or a.get("type") in ("hidden", "submit")):
                self.unlabelled_inputs += 1
        if tag == "script":
            if a.get("src"):
                self.scripts.append(a["src"])
            elif a.get("type") not in ("application/ld+json",):
                self.inline_scripts.append(self.getpos()[0])
        for key, value in attrs:
            if key.startswith("on"):
                self.inline_handlers.append(f"{key}@{self.getpos()[0]}")
            if key == "style":
                self.inline_styles.append(f"line {self.getpos()[0]}")
            if key == "class":
                self.classes.extend(value.split())
            if key in ("href", "src", "action") and value:
                if value.startswith(("http://", "https://", "//")):
                    self.external.append(value)
                elif value.startswith("/"):
                    self.refs.append((value.split("#")[0].split("?")[0], self.getpos()[0]))
            if key == "content" and tag == "meta" and a.get("name"):
                self.metas[a["name"]] = value
            if key == "content" and tag == "meta" and a.get("property"):
                self.metas[a["property"]] = value
        if tag == "link" and a.get("rel"):
            self.links.append((a["rel"], a.get("href", "")))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            problems.append(f"{rel(self.path)}: stray closing </{tag}> at line {self.getpos()[0]}")
            return
        if self.stack[-1] != tag:
            problems.append(f"{rel(self.path)}: </{tag}> closes <{self.stack[-1]}> at line {self.getpos()[0]}")
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass
            return
        self.stack.pop()


def css_classes():
    names = set()
    for path in CSS_FILES:
        text = open(path).read()
        for name in re.findall(r"\.([A-Za-z][A-Za-z0-9_-]*)", text):
            names.add(name)
    return names


def js_classes():
    names = set()
    for path in JS_FILES:
        text = open(path).read()
        for chunk in re.findall(r"class=\\\\?['\"]([^'\"]+)", text):
            names.update(chunk.split())
        for chunk in re.findall(r"className\s*=\s*['\"]([^'\"]+)", text):
            names.update(chunk.split())
        for chunk in re.findall(r"classList\.(?:add|toggle|remove)\(\s*['\"]([^'\"]+)", text):
            names.add(chunk)
    return names


def main():
    known = css_classes()
    pages = sorted(f for f in os.listdir(PUBLIC) if f.endswith(".html"))
    if not pages:
        problems.append("no HTML pages found in public/")
    for name in pages:
        path = os.path.join(PUBLIC, name)
        doc = Doc(path)
        doc.feed(open(path).read())
        if doc.stack:
            problems.append(f"{rel(path)}: unclosed tags at EOF: {doc.stack}")
        for cls in sorted(set(doc.classes)):
            if cls not in known:
                problems.append(f"{rel(path)}: class '{cls}' is not defined in the design system")
        if doc.h1 != 1:
            problems.append(f"{rel(path)}: expected exactly one <h1>, found {doc.h1}")
        if not doc.has_main:
            problems.append(f"{rel(path)}: missing <main> landmark")
        for line in doc.inline_scripts:
            problems.append(f"{rel(path)}: inline <script> at line {line} (CSP script-src 'self')")
        for item in doc.inline_handlers:
            problems.append(f"{rel(path)}: inline handler {item} (CSP script-src 'self')")
        for item in doc.inline_styles:
            problems.append(f"{rel(path)}: inline style attribute {item} (CSP style-src 'self')")
        if doc.style_blocks:
            problems.append(f"{rel(path)}: {doc.style_blocks} <style> block(s) - move to assets/pz.css")
        for url in doc.external:
            if not url.startswith("https://parkzone.in") and not url.startswith("mailto:"):
                warnings.append(f"{rel(path)}: external resource {url} (breaks self-contained CSP)")
        if doc.imgs_missing_alt:
            problems.append(f"{rel(path)}: {doc.imgs_missing_alt} <img> without alt")
        if doc.unlabelled_inputs:
            problems.append(f"{rel(path)}: {doc.unlabelled_inputs} form control(s) with no id/label")
        if doc.buttons_without_type:
            problems.append(f"{rel(path)}: {doc.buttons_without_type} <button> without type")
        for input_id in doc.input_ids:
            if input_id not in doc.labels_for:
                warnings.append(f"{rel(path)}: control #{input_id} has no <label for>")
        for meta in REQUIRED_META:
            if meta not in doc.metas:
                problems.append(f"{rel(path)}: missing <meta> {meta}")
        if "/assets/pz.css" not in [h for _, h in doc.links]:
            problems.append(f"{rel(path)}: does not load /assets/pz.css")
        if "/assets/pz.js" not in doc.scripts:
            problems.append(f"{rel(path)}: does not load /assets/pz.js")
        for ref, line in doc.refs:
            if ref.startswith("/api"):
                continue
            target = CLEAN_URLS.get(ref)
            if target is None:
                rel_path = ref.lstrip("/")
                target = rel_path if os.path.isfile(os.path.join(PUBLIC, rel_path)) else None
            if target is None:
                if ref == "/agent.exe":
                    warnings.append(f"{rel(path)}: {ref} not built yet (line {line})")
                else:
                    problems.append(f"{rel(path)}: dead link {ref} (line {line})")
            elif not os.path.isfile(os.path.join(PUBLIC, target)):
                problems.append(f"{rel(path)}: {ref} -> {target} does not exist")
        for src in doc.scripts:
            if src.startswith("/") and not os.path.isfile(os.path.join(PUBLIC, src.lstrip('/'))):
                problems.append(f"{rel(path)}: script {src} does not exist")

    for cls in sorted(js_classes()):
        # tokens like 'status-' come from "class='a status-' + state" concatenation
        if cls.endswith('-') or cls.endswith('_'):
            continue
        if cls not in known and not cls.isdigit():
            problems.append(f"JS-generated class '{cls}' is not defined in the design system")

    for path in CSS_FILES + JS_FILES:
        text = open(path).read()
        if path.endswith(".css") and text.count("{") != text.count("}"):
            problems.append(f"{rel(path)}: unbalanced braces")

    print(f"checked {len(pages)} page(s): {', '.join(pages)}")
    print(f"classes defined in the design system: {len(known)}")
    for w in warnings:
        print(f"  warn  {w}")
    for p in problems:
        print(f"  FAIL  {p}")
    print(f"\nfrontend checks: FAIL={len(problems)} WARN={len(warnings)}")
    if problems:
        sys.exit(1)
    print("FRONTEND CHECKS PASSED")


if __name__ == "__main__":
    main()
