#!/usr/bin/env python3
"""Generate the policy, status and 404 pages from one template.

Nav, footer, meta tags, CSP discipline and the toast container are therefore
identical on every static page. Edit this file, run it, done:

    python3 ops/build_pages.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
INDEX = open(os.path.join(PUBLIC, "index.html")).read()


def block(start, end):
    i = INDEX.index(start)
    j = INDEX.index(end, i) + len(end)
    return INDEX[i:j]


NAV = block('<header class="navbar">', '</header>')
FOOTER = block('<footer class="footer">', '</footer>')


def nav_for(active):
    nav = NAV.replace(' aria-current="page"', '')
    if active:
        nav = nav.replace('href="%s"' % active, 'href="%s" aria-current="page"' % active, 1)
    return nav


HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#05070a">
<meta name="robots" content="{robots}">
<link rel="canonical" href="https://{domain}{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ParkZone">
<meta property="og:locale" content="en_IN">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://{domain}{path}">
<meta property="og:image" content="https://{domain}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="ParkZone - Indian GPUs for Indian AI">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="https://{domain}/assets/og.png">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/jetbrains-mono-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/pz.css">
<script src="/assets/pz.js" defer></script>
{scripts}</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<div class="decor" aria-hidden="true"><div class="bg-grid"></div><div class="orb orb-a"></div></div>
{nav}
'''

TAIL = '''
{footer}
<div class="toast-wrap" role="status" aria-live="polite"></div>
</body>
</html>
'''

DOMAIN = "parkzone.in"

PAGES = {}

PAGES["status"] = dict(
    title="Platform status - ParkZone",
    desc="Live availability of the ParkZone API, marketplace, wallet and host agent distribution, plus recorded incidents.",
    robots="index, follow",
    active="/status",
    scripts='<script src="/assets/page-status.js" defer></script>\n',
    body='''
<main id="main" class="page">
  <section class="section">
    <div class="container">
      <h1 class="h1">Platform status</h1>
      <p class="lead mt-4">Checked live from your browser against this same domain, roughly every 30 seconds. If something here is red, support already knows - but tell us anyway.</p>
      <p class="doc-meta mt-4"><span>Snapshot <span class="mono" id="snapTime">-</span></span><span>Auto-refresh <span class="mono" id="snapCount">30</span>s</span></p>

      <div class="card card-pad mt-6">
        <h2 class="h3">Components</h2>
        <div class="mt-4" id="components">
          <div class="status-row"><span>API service</span><span class="status-pill status-unknown">checking</span></div>
          <div class="status-row"><span>Marketplace database</span><span class="status-pill status-unknown">checking</span></div>
          <div class="status-row"><span>Live GPU inventory</span><span class="status-pill status-unknown">checking</span></div>
          <div class="status-row"><span>Website and assets</span><span class="status-pill status-unknown">checking</span></div>
          <div class="status-row"><span>Host agent download</span><span class="status-pill status-unknown">checking</span></div>
          <div class="status-row"><span>UPI and card payments</span><span class="status-pill status-unknown">checking</span></div>
        </div>
      </div>

      <div class="grid-3 mt-6">
        <div class="stat-tile"><div class="stat"><span class="stat-num mono neon" id="statApi">-</span><span class="stat-label">API version</span></div></div>
        <div class="stat-tile"><div class="stat"><span class="stat-num mono" id="statGpus">-</span><span class="stat-label">GPUs online</span></div></div>
        <div class="stat-tile"><div class="stat"><span class="stat-num mono" id="statLatency">-</span><span class="stat-label">round-trip latency</span></div></div>
      </div>

      <div class="doc mt-7">
        <section>
          <h2>How we measure</h2>
          <ul>
            <li><strong>API service</strong> - a request to <span class="mono">/api/health</span> returning HTTP 200 with <span class="mono">&quot;db&quot;: &quot;up&quot;</span>.</li>
            <li><strong>Marketplace database</strong> - the database ping inside that same health response. A database outage makes the endpoint return 503.</li>
            <li><strong>Live GPU inventory</strong> - <span class="mono">/api/gpus</span> responding with a JSON array. An empty array is healthy: it means no host is parked right now.</li>
            <li><strong>Website and assets</strong> - this page loaded, so the static origin is serving.</li>
            <li><strong>Host agent download</strong> - a HEAD request to <span class="mono">/agent.exe</span>. Until the signed build ships this is reported as unavailable rather than broken.</li>
            <li><strong>Payments</strong> - reported as not yet live. Wallet top-ups are disabled in production until the payment gateway is connected.</li>
          </ul>
        </section>
        <section>
          <h2>Incident history</h2>
          <p>No incidents recorded. This page is append-only: when we break something, the incident, the cause and the fix are written here with timestamps, including the ones that make us look bad.</p>
        </section>
        <section>
          <h2>Availability policy</h2>
          <p>ParkZone is a best-effort marketplace. Instances run on host machines in Indian homes and small offices, so availability depends on individual hosts, not on a data-centre SLA. What we do commit to:</p>
          <ul>
            <li>Billing only for minutes an instance is actually up.</li>
            <li>Automatic credit back if an instance never reached running state.</li>
            <li>Stale hosts are removed from the marketplace within two minutes of their last heartbeat.</li>
            <li>An incident report on this page within one working day of any outage affecting rentals.</li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</main>
''',
)

PAGES["404"] = dict(
    title="Page not found - ParkZone",
    desc="That page does not exist on parkzone.in. Jump back to the live GPU marketplace.",
    robots="noindex, follow",
    active=None,
    filename="404.html",
    scripts="",
    body='''
<main id="main" class="page">
  <section class="section">
    <div class="container">
      <p class="eyebrow">Error 404</p>
      <h1 class="h1 mt-3">This URL is not parked here.</h1>
      <p class="lead mt-4">Nothing lives at that address. The marketplace, the host programme and the console all do.</p>
      <div class="btn-row mt-6">
        <a class="btn btn-primary btn-lg" href="/">Go to the marketplace</a>
        <a class="btn btn-ghost btn-lg" href="/host">Host your GPU</a>
      </div>
      <div class="grid-3 mt-7">
        <a class="card card-pad card-hover" href="/"><b class="block">Live GPU prices</b><p class="small muted mt-2">Every online host, refreshed continuously.</p></a>
        <a class="card card-pad card-hover" href="/dashboard"><b class="block">Renter console</b><p class="small muted mt-2">Wallet, instances, SSH and Jupyter endpoints.</p></a>
        <a class="card card-pad card-hover" href="/status"><b class="block">Platform status</b><p class="small muted mt-2">Live health of the API and database.</p></a>
      </div>
      <p class="small faint mt-6">If you followed a link from inside ParkZone, tell us at <a class="neon" href="mailto:support@parkzone.in">support@parkzone.in</a> and we will fix it.</p>
    </div>
  </section>
</main>
''',
)

PAGES["terms"] = dict(
    title="Terms of service - ParkZone",
    desc="The rules for renting GPUs and hosting GPUs on parkzone.in, including billing, prohibited use, liability and governing law.",
    robots="index, follow",
    active=None,
    scripts="",
    body='''
<main id="main" class="page">
  <section class="section">
    <div class="container">
      <h1 class="h1">Terms of service</h1>
      <p class="doc-meta mt-4"><span>Version 1.0</span><span>Effective 1 October 2026</span><span>Governing law: India</span></p>
      <div class="doc mt-6">
        <section>
          <h2>1. What ParkZone is</h2>
          <p>ParkZone (<span class="mono">parkzone.in</span>) is a marketplace. It connects people who want to rent GPU compute (&quot;renters&quot;) with people who own GPUs and want to rent them out (&quot;hosts&quot;). ParkZone is not the owner of the hardware and is not a cloud provider. Hosts are independent sellers of compute; ParkZone provides the discovery, metering, billing and payout layer.</p>
        </section>
        <section>
          <h2>2. Accounts</h2>
          <p>You identify yourself with an email address. You are responsible for the address you supply, for keeping access to it, and for everything done through it. One person may be both a renter and a host. You must be at least 18 years old and legally able to enter into a contract.</p>
        </section>
        <section>
          <h2>3. Wallet and billing</h2>
          <ul>
            <li>Prices are in Indian rupees and are set per GPU by the host. The renter pays the host's rate plus ParkZone's platform fee; the host receives the full rate they set.</li>
            <li>Billing is per <strong>started minute</strong>. A minute begins when an instance reaches running state and ends when it is stopped. A partial minute is charged as a full minute.</li>
            <li>Funds sit in your ParkZone wallet as prepaid credit, denominated in paise. An instance will not start unless your balance covers the minimum credit hold shown at checkout.</li>
            <li>Balances are never driven below zero: if a balance runs out mid-session, the charge is capped at the remaining balance and the instance is stopped.</li>
            <li>Every credit and debit is recorded in an append-only ledger visible in your console.</li>
            <li>Top-ups are non-transferable between accounts. Refunds are governed by the <a href="/refund">refund policy</a>.</li>
          </ul>
        </section>
        <section>
          <h2>4. Renter obligations</h2>
          <ul>
            <li>Do not run cryptocurrency mining, password cracking, denial-of-service traffic, port scanning of third parties, or any other abusive or unlawful workload.</li>
            <li>Runtime images are restricted to a published allow-list. Attempting to bypass it is a breach of these terms.</li>
            <li>You are responsible for anything you upload, train, serve or download inside your instance, and for complying with the licences of the software you use.</li>
            <li>Do not attempt to access the host's operating system, other tenants' data, or the ParkZone infrastructure beyond the endpoints provided to you.</li>
            <li>Instances are single-tenant and non-resellable. Do not provide public third-party access to an instance you rent.</li>
          </ul>
        </section>
        <section>
          <h2>5. Host obligations</h2>
          <ul>
            <li>Only list hardware you own or are authorised to rent out, with driver and Docker versions that actually support the workloads you accept.</li>
            <li>Do not inspect, retain, copy or interfere with renter data, containers or traffic. Hosts are the custodian of the machine, not of the renter's content.</li>
            <li>Notify ParkZone promptly of hardware faults. Uptime is tracked; sustained low uptime lowers marketplace ranking and may end the listing.</li>
            <li>You are responsible for your own electricity cost, hardware maintenance, internet connection and any tax on income you receive. ParkZone provides an earnings statement for your records.</li>
            <li>Payouts require identity verification above the statutory threshold, and are made to the UPI identifier on your host profile.</li>
          </ul>
        </section>
        <section>
          <h2>6. Prohibited use</h2>
          <p>The following are grounds for immediate suspension without refund: unlawful activity, child sexual abuse material, malware distribution, sanctions evasion, mining payloads, excessive resource abuse that degrades other tenants, scraping or attacking other users, and misrepresenting GPU hardware in a listing.</p>
        </section>
        <section>
          <h2>7. Your content and intellectual property</h2>
          <p>You keep all rights to the code, data, models and weights you bring. We claim no licence over them. We only process the metadata needed to run the service: instance status, resource usage, endpoints and billing records.</p>
        </section>
        <section>
          <h2>8. Availability</h2>
          <p>Compute is supplied by independent hosts, so ParkZone does not offer a data-centre SLA and does not warrant that a specific GPU will be available at a specific moment. We do commit to billing only for minutes an instance is up, and to crediting you if an instance never started. See the <a href="/status">status page</a> for current health and incident history.</p>
        </section>
        <section>
          <h2>9. Suspension and termination</h2>
          <p>We may suspend or terminate an account that breaches these terms, that is required to be blocked by law, or that presents a security or fraud risk. Where it is lawful and practical we will tell you why. On termination, any unused wallet balance is refunded to the original payment method, minus amounts subject to a chargeback or dispute.</p>
        </section>
        <section>
          <h2>10. Limitation of liability</h2>
          <p>To the maximum extent permitted by Indian law, ParkZone's total liability for any claim is limited to the greater of the fees you paid ParkZone in the three months before the claim, or Rs 1,000. We are not liable for indirect or consequential loss, lost profits, lost data or lost research time. Nothing here excludes liability that cannot lawfully be excluded.</p>
        </section>
        <section>
          <h2>11. Changes and governing law</h2>
          <p>We may update these terms; material changes will be posted here with a new version number and an effective date. These terms are governed by the laws of India, and the courts at the place of ParkZone's registered office have exclusive jurisdiction, without prejudice to your statutory consumer rights.</p>
        </section>
        <section>
          <h2>12. Contact</h2>
          <p>Support: <a href="mailto:support@parkzone.in">support@parkzone.in</a>. Hosts: <a href="mailto:hosts@parkzone.in">hosts@parkzone.in</a>. Grievance officer details are on the <a href="/refund#grievance">refund policy</a> page.</p>
        </section>
      </div>
    </div>
  </section>
</main>
''',
)

PAGES["privacy"] = dict(
    title="Privacy and DPDP notice - ParkZone",
    desc="What ParkZone collects, why, how long it is kept, who it is shared with, and your rights under India's Digital Personal Data Protection Act, 2023.",
    robots="index, follow",
    active=None,
    scripts="",
    body='''
<main id="main" class="page">
  <section class="section">
    <div class="container">
      <h1 class="h1">Privacy notice</h1>
      <p class="doc-meta mt-4"><span>Version 1.0</span><span>Effective 1 October 2026</span><span>Framework: DPDP Act, 2023</span></p>
      <p class="lead mt-4">Short version: we collect the minimum needed to meter GPU rentals and pay hosts, we do not sell data, and there are no advertising trackers on this site.</p>
      <div class="doc mt-6">
        <section>
          <h2>What we collect</h2>
          <ul>
            <li><strong>Account data</strong> - your email address, because it is your identity and your wallet's key.</li>
            <li><strong>Billing data</strong> - wallet top-ups, per-minute charges, instance balances, payout references. Monetary values are stored as integers in paise.</li>
            <li><strong>Host telemetry</strong> - GPU model, VRAM, city, your chosen hourly price, and a heartbeat timestamp every 30 seconds. This is what makes a live marketplace possible.</li>
            <li><strong>Instance metadata</strong> - instance id, host id, container image, SSH and Jupyter port numbers, status and timestamps.</li>
            <li><strong>Technical data</strong> - server logs of requests: path, status code, latency, and the IP address making the request, used for rate limiting, abuse prevention and incident forensics.</li>
          </ul>
          <div class="doc-note mt-4"><p><strong>What we never collect:</strong> the contents of your notebooks, datasets, prompts, model weights, containers or terminal traffic. ParkZone has no visibility into workload data.</p></div>
        </section>
        <section>
          <h2>Why we process it</h2>
          <ul>
            <li>To provide the service you asked for: metering a rental and issuing SSH details (performance of a contract).</li>
            <li>To take payment, and to prevent fraud and abuse such as mining payloads (legitimate purposes, and our legal obligations).</li>
            <li>To keep the marketplace honest: uptime scores and ranking (legitimate purpose).</li>
            <li>To meet tax, accounting and KYC obligations (legal obligation).</li>
          </ul>
          <p>We do not use your data for advertising, and we do not build ad profiles.</p>
        </section>
        <section>
          <h2>Who we share it with</h2>
          <ul>
            <li><strong>The other side of a transaction</strong> - a host sees the rental exists and its ports; a renter sees the host's card, city and price. Email addresses are not published in the marketplace.</li>
            <li><strong>Payment gateway</strong> - for processing top-ups and payouts, once enabled.</li>
            <li><strong>Infrastructure providers</strong> - the database and server hosting this service.</li>
            <li><strong>Authorities</strong> - where we are legally compelled, and only to the extent compelled.</li>
          </ul>
          <p>We do not sell personal data and we do not share it with data brokers.</p>
        </section>
        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Ledger and billing records: 8 years, as required for tax and accounting purposes.</li>
            <li>Instance metadata: 90 days rolling.</li>
            <li>Host heartbeats: the live record plus 30 days.</li>
            <li>Request logs: 30 days.</li>
            <li>On a verified deletion request, everything not required by law is erased within 30 days.</li>
          </ul>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>Under the Digital Personal Data Protection Act, 2023 you can ask to access your data, correct it, erase it, withdraw consent, nominate someone to exercise your rights, and complain to the Data Protection Board. Write to <a href="mailto:privacy@parkzone.in">privacy@parkzone.in</a> from the address on your account and we will respond within 30 days. You can also export your ledger from the console.</p>
        </section>
        <section>
          <h2>Security</h2>
          <p>TLS everywhere, HTTP strictly redirected to HTTPS. The database is reachable only from the application server using a least-privilege account, and secrets live in server-side environment files rather than the repository. Access to production is logged. No system is perfect - if you find a vulnerability, mail <a href="mailto:security@parkzone.in">security@parkzone.in</a> and we will credit you.</p>
        </section>
        <section>
          <h2>Cookies and local storage</h2>
          <p>This site sets no advertising or analytics cookies. Your browser's local storage holds two things: the email you last used (so the console greets you) and a UI preference. Both stay on your device and can be cleared at any time. Fonts are self-hosted, so loading a page does not leak your IP to a third-party font CDN.</p>
        </section>
        <section>
          <h2>Children</h2>
          <p>The service is for adults. We do not knowingly process data of anyone under 18; if you believe a minor has an account, tell us and we will remove it.</p>
        </section>
        <section>
          <h2>Grievance officer</h2>
          <p>In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:</p>
          <ul>
            <li>Grievance Officer, ParkZone - <a href="mailto:grievance@parkzone.in">grievance@parkzone.in</a></li>
            <li>Acknowledgement within 24 hours, resolution within 15 days of receipt.</li>
            <li>Postal address is available on request and is published in the footer of the invoiced account once the registered office address is finalised.</li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</main>
''',
)

PAGES["refund"] = dict(
    title="Refund policy and grievance officer - ParkZone",
    desc="When ParkZone refunds GPU rental credit, how long it takes, how failed instances are handled, and how to escalate a complaint.",
    robots="index, follow",
    active=None,
    scripts="",
    body='''
<main id="main" class="page">
  <section class="section">
    <div class="container">
      <h1 class="h1">Refund policy</h1>
      <p class="doc-meta mt-4"><span>Version 1.0</span><span>Effective 1 October 2026</span><span>Applies to renters and hosts</span></p>
      <p class="lead mt-4">We would rather be clear than clever about money. Here is exactly when you get credit back and when you do not.</p>
      <div class="doc mt-6">
        <section>
          <h2>Automatic credit - no request needed</h2>
          <ul>
            <li><strong>Instance never started.</strong> If a rental fails to reach running state, the hold is released and nothing is charged.</li>
            <li><strong>Host went offline mid-session.</strong> Billing stops at the last measured minute; you are not charged for time the host was unreachable.</li>
            <li><strong>Duplicate charge.</strong> Rentals and top-ups carry idempotency keys, so a retried request cannot bill twice. If one slips through, it is reversed in full.</li>
          </ul>
        </section>
        <section>
          <h2>Unused wallet balance</h2>
          <p>Your unspent balance is your money. Ask for it back within <strong>7 days</strong> of your last top-up and it is refunded to the original payment method in full - no restocking fee, no minimum. After 7 days the balance stays in your wallet for future rentals and remains refundable at any time.</p>
          <ul>
            <li>Refund window: 7 days from top-up for a no-questions cash refund; any time for a wallet-credit return to source.</li>
            <li>Processing time: 5 to 7 working days to the original UPI account, card or bank account, depending on the payment rail.</li>
            <li>Partial refunds are supported: tell us the amount, and the rest stays as wallet credit.</li>
          </ul>
        </section>
        <section>
          <h2>What is not refundable</h2>
          <ul>
            <li>Minutes already consumed by a running instance. Compute was delivered and the host must be paid.</li>
            <li>Rentals stopped for breaching the <a href="/terms">terms of service</a>, including mining payloads or abuse. Those balances are forfeited.</li>
            <li>Time lost to your own misconfiguration - a broken image layer, a runaway script, or forgetting to stop an instance.</li>
            <li>Third-party costs you incurred outside ParkZone, such as cloud egress or your own internet charges.</li>
          </ul>
        </section>
        <section>
          <h2>Host payouts</h2>
          <p>Hosts are paid weekly once the balance crosses Rs 500. A payout can be held where a rental is under dispute or a chargeback has been received; the hold is released or reversed once the dispute closes. Hosts who stop hosting can request the full remaining balance as a payout within 30 days.</p>
        </section>
        <section>
          <h2>Invoices and tax</h2>
          <p>GST-compliant invoices are available for every top-up and rental period and can be downloaded from your console. Business accounts can add a GSTIN to their profile so the invoice is issued to the company rather than the individual.</p>
        </section>
        <section>
          <h2>How to request a refund</h2>
          <ol>
            <li>Mail <a href="mailto:refunds@parkzone.in">refunds@parkzone.in</a> from the address on your account.</li>
            <li>Include the instance id or top-up reference shown in your ledger, plus the amount.</li>
            <li>We acknowledge within 24 hours and tell you the outcome in writing. Approved refunds are initiated the same working day.</li>
          </ol>
        </section>
        <section id="grievance">
          <h2>Grievance officer</h2>
          <p>If a refund decision does not satisfy you, escalate to the grievance officer appointed under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021:</p>
          <ul>
            <li>Grievance Officer, ParkZone - <a href="mailto:grievance@parkzone.in">grievance@parkzone.in</a></li>
            <li>Acknowledgement within 24 hours; resolution within 15 days.</li>
            <li>Postal address: published in the footer of your invoice. The registered-office address is available on request.</li>
          </ul>
          <p class="doc-note">Nothing in this policy limits your rights under the Consumer Protection Act, 2019, including your right to approach a consumer commission.</p>
        </section>
      </div>
    </div>
  </section>
</main>
''',
)


def build():
    written = []
    for slug, cfg in PAGES.items():
        path = "/" + slug
        filename = cfg.get("filename", slug + ".html")
        html = HEAD.format(
            title=cfg["title"],
            desc=cfg["desc"],
            robots=cfg["robots"],
            domain=DOMAIN,
            path=path,
            scripts=cfg["scripts"],
            nav=nav_for(cfg["active"]),
        ) + cfg["body"] + TAIL.format(footer=FOOTER)
        with open(os.path.join(PUBLIC, filename), "w") as fh:
            fh.write(html)
        written.append((filename, len(html)))
    return written


if __name__ == "__main__":
    for name, size in build():
        print(f"wrote public/{name} ({size} bytes)")
