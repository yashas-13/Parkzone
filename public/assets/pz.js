/* ==========================================================================
   ParkZone site runtime - pz.js
   Loaded by every page as a classic script (no bundler, CSP script-src 'self').
   Exposes one global: window.PZ
   ========================================================================== */
(function (window, document) {
  'use strict';

  var PZ = {};
  PZ.version = '2.0.0';

  /* ------------------------------------------------------------- config -- */
  function meta(name, fallback) {
    var el = document.querySelector('meta[name="' + name + '"]');
    var value = el && el.getAttribute('content');
    return value && value.trim() ? value.trim() : fallback;
  }

  // Same-origin by default: nginx proxies /api/* to the FastAPI service.
  // A meta tag can override it for local development against :8080.
  PZ.apiBase = (meta('pz-api-base', '/api') || '/api').replace(/\/+$/, '');
  PZ.pollMs = parseInt(meta('pz-poll-ms', '10000'), 10) || 10000;

  /* ------------------------------------------------------------ helpers -- */
  PZ.qs = function (sel, root) { return (root || document).querySelector(sel); };
  PZ.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /** Escape untrusted text before it ever touches innerHTML.
   *  Host agents (and therefore gpu_model/city strings) are user input. */
  PZ.esc = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"'/`]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#47;', '`': '&#96;' }[c];
    });
  };

  PZ.cssVar = function (el, name, value) { if (el && el.style) { el.style.setProperty(name, value); } };

  PZ.debounce = function (fn, wait) {
    // `wait` is honoured exactly: 0 means "next tick", and only an omitted wait
    // falls back to the 200ms default (the old `wait || 200` turned 0 into 200).
    var delay = (wait === undefined || wait === null) ? 200 : wait;
    var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, delay); };
  };

  /* ------------------------------------------------------------ numbers -- */
  /** Indian digit grouping: 1234567 -> 12,34,567 */
  PZ.num = function (n) {
    var s = String(Math.round(Number(n) || 0));
    if (s.length <= 3) { return s; }
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return rest + ',' + last3;
  };
  PZ.rupees = function (n) { return 'Rs ' + PZ.num(n); };
  /** paise -> 'Rs 499.51' */
  PZ.money = function (paise) {
    var v = (Number(paise) || 0) / 100;
    return 'Rs ' + v.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  PZ.gb = function (mb) {
    var v = Number(mb) || 0;
    if (v >= 1024) { var g = v / 1024; return (g % 1 ? g.toFixed(1) : g) + ' GB'; }
    return v + ' MB';
  };
  PZ.tier = function (name) {
    var n = String(name || '');
    if (/H100|A100|B200|B300/i.test(n)) { return { label: 'Datacenter', cls: 'badge-datacenter' }; }
    if (/4090|5090|4080/i.test(n)) { return { label: 'Flagship', cls: 'badge-flagship' }; }
    if (/3090|3080|4070|5070|A4000|A5000/i.test(n)) { return { label: 'High-end', cls: 'badge-highend' }; }
    return { label: 'Budget', cls: 'badge-budget' };
  };
  PZ.relative = function (iso) {
    if (!iso) { return 'never'; }
    var then = new Date(iso).getTime();
    if (!then) { return 'never'; }
    var s = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (s < 60) { return s + 's ago'; }
    if (s < 3600) { return Math.round(s / 60) + 'm ago'; }
    if (s < 86400) { return Math.round(s / 3600) + 'h ago'; }
    return Math.round(s / 86400) + 'd ago';
  };
  PZ.time = function (d) { return (d || new Date()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
  PZ.emailOk = function (v) { return /^[^@\s]{1,64}@[A-Za-z0-9]([A-Za-z0-9.-]{0,188})[A-Za-z0-9]\.[A-Za-z]{2,24}$/.test(String(v || '').trim()); };

  /* ---------------------------------------------------------------- api -- */
  /** PZ.api('/gpus', {timeout: 8000}) -> parsed JSON, throws PZ.ApiError */
  PZ.api = function (path, opts) {
    opts = opts || {};
    var url = /^https?:\/\//.test(path) ? path : PZ.apiBase + path;
    var controller = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) { controller.abort(); } }, opts.timeout || 12000);
    var init = {
      method: opts.method || 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin'
    };
    if (controller) { init.signal = controller.signal; }
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(url, init).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = { detail: 'Malformed response' }; }
        if (!res.ok) {
          var err = new Error((data && (data.detail || data.message)) || ('Request failed (' + res.status + ')'));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    }).finally(function () { clearTimeout(timer); });
  };

  /* ------------------------------------------------------------- storage -- */
  PZ.store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };
  PZ.EMAIL_KEY = 'pz_email';
  PZ.email = function () { return PZ.store.get(PZ.EMAIL_KEY) || ''; };

  window.PZ = PZ;
})(window, document);

/* ======================================================================== *
   UI kit                                                                   *
   ======================================================================== */
PZ.ready = function (fn) {
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', fn); }
  else { fn(); }
};

/* ---------------------------------------------------------------- toast -- */
PZ.toast = function (message, kind, ms) {
  var wrap = PZ.qs('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
  var el = document.createElement('div');
  el.className = 'toast' + (kind ? ' toast-' + kind : '');
  el.textContent = String(message);
  wrap.appendChild(el);
  setTimeout(function () { el.remove(); }, ms || 3600);
};

/* -------------------------------------------------------------- counters -- */
PZ.countUp = function (el, to, opts) {
  opts = opts || {};
  var from = Number(opts.from || 0), dur = opts.duration || 900, start = null;
  var fmt = opts.format || function (v) { return PZ.num(v); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.textContent = fmt(to); return; }
  function step(ts) {
    if (start === null) { start = ts; }
    var p = Math.min(1, (ts - start) / dur);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (p < 1) { window.requestAnimationFrame(step); }
  }
  window.requestAnimationFrame(step);
};

/* ---------------------------------------------------------------- reveal -- */
PZ.reveal = function (root) {
  var els = PZ.qsa('.reveal', root);
  if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach(function (e) { io.observe(e); });
};

/* -------------------------------------------------------------- skeleton -- */
PZ.skeletons = function (container, count) {
  var html = '';
  for (var i = 0; i < (count || 3); i++) {
    html += '<div class="gpu" aria-hidden="true"><div class="gpu-top"><div class="skel skel-line w-60"></div><div class="skel skel-line w-40"></div></div>' +
      '<div class="skel skel-line w-80"></div><div class="skel skel-line w-40"></div>' +
      '<div class="skel skel-cta"></div></div>';
  }
  container.innerHTML = html;
};

/* ------------------------------------------------------------- sparkline -- */
PZ.sparkline = function (values, w, h) {
  w = w || 260; h = h || 34;
  var vals = (values || []).filter(function (v) { return isFinite(v); });
  if (vals.length < 2) { return ''; }
  var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  var span = (max - min) || 1;
  var step = w / (vals.length - 1);
  var pts = vals.map(function (v, i) {
    return [i * step, h - 3 - ((v - min) / span) * (h - 8)];
  });
  var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  var area = line + ' L' + w + ' ' + h + ' L0 ' + h + ' Z';
  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Price trend">' +
    '<defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00ff88"/><stop offset="100%" stop-color="#00ff88" stop-opacity="0"/></linearGradient></defs>' +
    '<path class="fill" d="' + area + '"/><path d="' + line + '"/></svg>';
};
PZ.priceHistory = function (hostId, price) {
  PZ._hist = PZ._hist || {};
  var series = PZ._hist[hostId] || (PZ._hist[hostId] = []);
  series.push(Number(price) || 0);
  while (series.length > 24) { series.shift(); }
  return series.length < 2 ? null : series;
};

/* ------------------------------------------------------------------ copy -- */
PZ.copy = function (text, btn) {
  function done() {
    if (!btn) { PZ.toast('Copied to clipboard', 'ok'); return; }
    var old = btn.textContent; btn.textContent = 'Copied';
    setTimeout(function () { btn.textContent = old; }, 1600);
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(function () { PZ.toast('Copy failed - select manually', 'err'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { PZ.toast('Copy failed - select manually', 'err'); }
    ta.remove();
  }
};

/* ------------------------------------------------------- tabs / faq / nav -- */
PZ.tabs = function () {
  PZ.qsa('[data-tabs]').forEach(function (group) {
    var tabs = PZ.qsa('[role="tab"]', group);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var selected = t === tab;
          t.setAttribute('aria-selected', String(selected));
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) { panel.hidden = !selected; }
        });
      });
      tab.addEventListener('keydown', function (ev) {
        var idx = tabs.indexOf(tab);
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
          ev.preventDefault();
          var next = tabs[(idx + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          next.focus(); next.click();
        }
      });
    });
  });
};

PZ.faq = function () {
  PZ.qsa('.faq').forEach(function (item) {
    var q = PZ.qs('.faq-q', item);
    if (!q) { return; }
    q.addEventListener('click', function () {
      var open = item.classList.toggle('is-open');
      q.setAttribute('aria-expanded', String(open));
    });
  });
};

PZ.nav = function () {
  var toggle = PZ.qs('.nav-toggle'), drawer = PZ.qs('.nav-drawer');
  if (!toggle || !drawer) { return; }
  toggle.addEventListener('click', function () {
    var open = drawer.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
};

/* -------------------------------------------------------------- init core -- */
PZ.init = function () {
  PZ.tabs(); PZ.faq(); PZ.nav(); PZ.reveal();
  PZ.qsa('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () { PZ.copy(btn.getAttribute('data-copy'), btn); });
  });
  var year = PZ.qs('[data-year]');
  if (year) { year.textContent = String(new Date().getFullYear()); }
};
