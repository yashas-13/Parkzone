/*!
 * Renders the real pages in jsdom, executes their real scripts against a mocked
 * API, and asserts the UI actually comes up. This is the check that catches a
 * JS runtime error the static front-end checker can never see.
 *
 *   node tests/render.test.cjs
 */
'use strict';
const path = require('path');
const { spawn } = require('child_process');
// Find jsdom: explicit path, then local installs, then a global-ish location.
function resolveJsdom() {
  const candidates = [
    process.env.JSDOM_PATH,
    'jsdom',
    path.resolve(__dirname, '..', 'node_modules', 'jsdom'),
    path.resolve(__dirname, '..', '..', 'tmp', 'jsdomtest', 'node_modules', 'jsdom'),
    '/data/data/com.termux/files/home/tmp/jsdomtest/node_modules/jsdom',
  ].filter(Boolean);
  const errors = [];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (e) { errors.push(`${candidate}: ${e.code || e.message}`); }
  }
  console.log('SKIP: jsdom is not installed.');
  console.log('      npm i --no-save jsdom   (then re-run: node tests/render.test.cjs)');
  process.exit(2);
}
const { JSDOM } = resolveJsdom();

const PORT = 8123;
const ROOT = path.resolve(__dirname, '..', 'public');
const ORIGIN = `http://127.0.0.1:${PORT}`;

const GPU_FIXTURE = [
  { host_id: 'PC_4090AA', gpu_model: 'NVIDIA GeForce RTX 4090', vram: 24564, city: 'Mumbai', display_price: 29, uptime: 99.4, last_heartbeat: new Date().toISOString() },
  { host_id: 'PC_3090BB', gpu_model: 'NVIDIA GeForce RTX 3090', vram: 24576, city: 'Pune', display_price: 19, uptime: 97.1, last_heartbeat: new Date().toISOString() },
];

let failures = 0;
function check(name, ok, extra) {
  if (ok) { console.log(`  ok    ${name}`); }
  else { failures += 1; console.log(`  FAIL  ${name}${extra ? ' - ' + extra : ''}`); }
}

function api(pathname) {
  if (pathname === '/api/gpus') return GPU_FIXTURE;
  if (pathname === '/api/stats') {
    return { gpus_online: 2, cities: ['Mumbai', 'Pune'], min_price: 19, max_price: 29, avg_price: 24, avg_uptime: 98.3, aws_4090_price: 98 };
  }
  if (pathname === '/api/health') return { ok: true, version: '2.0.0', db: 'up', dev_mode: true };
  if (pathname === '/api/version') return { version: '2.0.0', domain: 'parkzone.in', dev_mode: true, markup: 1.38 };
  if (pathname === '/api/wallet') return { email: 'me@example.in', balance: 50000, currency: 'INR', hold_minutes: 10 };
  if (pathname.startsWith('/api/instances') || pathname.startsWith('/api/ledger')) return [];
  if (pathname.startsWith('/api/gpus')) return [];
  return [];
}

function jsonResponse(data, status) {
  status = status || 200;
  return { ok: status < 400, status, text: () => Promise.resolve(JSON.stringify(data)) };
}

function loadPage(url, label, errors) {
  return JSDOM.fromURL(url, {
    runScripts: 'dangerously',
    resources: 'usable',  // load /assets/pz.js + page script from the static server
    pretendToBeVisual: true,
    beforeParse(window) {
      // jsdom has no fetch, no IntersectionObserver and no scrollIntoView
      window.fetch = (input) => {
        const raw = typeof input === 'string' ? input : input.url;
        let pathname = raw;
        try { pathname = new URL(raw, ORIGIN).pathname; } catch (e) { /* ignore */ }
        if (pathname.startsWith('/api/')) {
          const data = api(pathname);
          return Promise.resolve(jsonResponse(data));
        }
        return Promise.resolve(jsonResponse({}, 404));
      };
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.Element.prototype.scrollIntoView = function () {};
      window.addEventListener('error', (ev) => errors.push(`${label}: ${ev.message}`));
      window.addEventListener('unhandledrejection', (ev) => errors.push(`${label}: unhandled ${ev.reason}`));
    },
  });
}

function settle(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(predicate, timeout) {
  const deadline = Date.now() + (timeout || 2000);
  while (Date.now() < deadline) {
    try { if (predicate()) { return true; } } catch (e) { /* keep polling */ }
    await settle(50);
  }
  try { return !!predicate(); } catch (e) { return false; }
}

async function main() {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', ROOT], {
    stdio: 'ignore',
  });
  await settle(1500);
  const errors = [];

  try {
    /* ---------------------------------------------------------- landing -- */
    console.log('\nlanding page');
    const home = await loadPage(ORIGIN + '/', 'index', errors);
    const { window } = home;
    const doc = window.document;
    await settle(1200);

    check('no runtime errors on load', errors.length === 0, errors.join(' | '));
    check('h1 renders', /Indian GPUs for/.test(doc.querySelector('h1').textContent));
    check('grid renders a card per live host', doc.querySelectorAll('#marketGrid .gpu').length === 2,
      `${doc.querySelectorAll('#marketGrid .gpu').length} cards`);
    // default sort is price ascending, so locate cards by their model rather than position
    const names = [...doc.querySelectorAll('.gpu-name')].map((el) => el.textContent);
    check('both live GPUs rendered', names.some((n) => /4090/.test(n)) && names.some((n) => /3090/.test(n)), names.join(' / '));
    const card4090 = [...doc.querySelectorAll('.gpu')].find((c) => /4090/.test(c.querySelector('.gpu-name').textContent));
    check('4090 card shows price and per-minute rate', /29/.test(card4090.querySelector('.gpu-price').textContent) && /49/.test(card4090.querySelector('.gpu-price').textContent), card4090.querySelector('.gpu-price').textContent);
    check('uptime bar width is set', /%$/.test(doc.querySelector('.bar-fill').style.getPropertyValue('--w')),
      `--w=${doc.querySelector('.bar-fill').style.getPropertyValue('--w')}`);
    check('nav counter shows live count', /2 online/.test(doc.querySelector('#navCount').textContent), doc.querySelector('#navCount').textContent);
    // the count-up is an animation - poll rather than sampling it at a fixed instant
    check('hero count-up reaches the live count', await waitFor(() => doc.querySelector('#statGpus').textContent.trim() === '2', 4000), doc.querySelector('#statGpus').textContent);
    check('ticker populated', doc.querySelectorAll('#tickerTrack .ticker-item').length >= 2);
    check('city select filled from live data', [...doc.querySelectorAll('#city option')].some((o) => o.value === 'Pune'));
    check('no skeletons left behind', doc.querySelectorAll('#marketGrid .skel').length === 0);

    // filters
    doc.querySelector('#city').value = 'Pune';
    doc.querySelector('#city').dispatchEvent(new window.Event('change'));
    await waitFor(() => doc.querySelectorAll('#marketGrid .gpu').length === 1, 1500);
    check('city filter narrows to one card', doc.querySelectorAll('#marketGrid .gpu').length === 1,
      `${doc.querySelectorAll('#marketGrid .gpu').length} cards after selecting Pune`);
    doc.querySelector('#city').value = '';
    doc.querySelector('#city').dispatchEvent(new window.Event('change'));
    await settle(150);

    // gpu chip filter
    [...doc.querySelectorAll('#gpuChips .chip')].find((c) => c.dataset.chip === '3090').click();
    await settle(150);
    check('chip filter works', doc.querySelectorAll('#marketGrid .gpu').length === 1 && /3090/.test(doc.querySelector('.gpu-name').textContent));
    [...doc.querySelectorAll('#gpuChips .chip')].find((c) => c.dataset.chip === 'all').click();
    await settle(150);

    // rent modal
    doc.querySelector('[data-rent]').click();
    await settle(120);
    check('rent modal opens', doc.querySelector('#rentModal').hidden === false);
    check('modal is pre-filled with host and price', /PC_/.test(doc.querySelector('#rentHost').textContent), doc.querySelector('#rentHost').textContent);
    check('per-minute estimate shown', /paise/.test(doc.querySelector('#rentPerMin').textContent));
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    await settle(80);
    check('escape closes the modal', doc.querySelector('#rentModal').hidden === true);

    // FAQ
    const faq = doc.querySelector('.faq');
    faq.querySelector('.faq-q').click();
    check('faq expands', faq.classList.contains('is-open'));

    // API tabs
    doc.querySelector('#tab-py').click();
    check('tab switches panel', doc.querySelector('#panel-py').hidden === false && doc.querySelector('#panel-curl').hidden === true);

    // calculator responds
    const rate = doc.querySelector('#calcRate');
    rate.value = '100';
    rate.dispatchEvent(new window.Event('input'));
    await settle(80);
    check('savings calculator recomputes', doc.querySelector('#calcCost').textContent !== 'Rs 2,320', doc.querySelector('#calcCost').textContent);

    // header/footer present
    check('footer legal links present', doc.querySelectorAll('footer a[href="/terms"]').length === 1);
    check('single h1', doc.querySelectorAll('h1').length === 1);

    window.close();

    /* ------------------------------------------------------------- host -- */
    console.log('\nhost page');
    const host = await loadPage(ORIGIN + '/host.html', 'host', errors);
    const hdoc = host.window.document;
    await settle(1200);
    check('no runtime errors', errors.filter((e) => e.startsWith('host:')).length === 0, errors.join(' | '));
    check('demand stats painted', /2/.test(hdoc.querySelector('#demandGpus').textContent), hdoc.querySelector('#demandGpus').textContent);
    check('earnings calculator computed', /^Rs /.test(hdoc.querySelector('#hNet').textContent), hdoc.querySelector('#hNet').textContent);
    const hRate = hdoc.querySelector('#hRate');
    hRate.value = '50';
    hRate.dispatchEvent(new host.window.Event('input'));
    await settle(80);
    check('calculator reacts to slider', hdoc.querySelector('#hEarn').textContent !== 'Rs 4,200', hdoc.querySelector('#hEarn').textContent);
    check('faq works here too', (() => { hdoc.querySelector('.faq').querySelector('.faq-q').click(); return hdoc.querySelector('.faq').classList.contains('is-open'); })());
    host.window.close();

    /* --------------------------------------------------------- console -- */
    console.log('\nconsole page');
    const dash = await loadPage(ORIGIN + '/dashboard.html', 'console', errors);
    const ddoc = dash.window.document;
    await settle(600);
    check('gate shown first', ddoc.querySelector('#gate').hidden === false && ddoc.querySelector('#console').hidden === true);
    ddoc.querySelector('#gateEmail').value = 'not-an-email';
    ddoc.querySelector('#gateForm').dispatchEvent(new dash.window.Event('submit'));
    await settle(80);
    check('invalid email is rejected', ddoc.querySelector('#gateErr').hidden === false && ddoc.querySelector('#console').hidden === true);
    ddoc.querySelector('#gateEmail').value = 'me@example.in';
    ddoc.querySelector('#gateForm').dispatchEvent(new dash.window.Event('submit'));
    await settle(900);
    check('console opens with a valid email', ddoc.querySelector('#console').hidden === false);
    check('wallet balance painted', /500\.00/.test(ddoc.querySelector('#balance').textContent), ddoc.querySelector('#balance').textContent);
    check('empty state explains what to do', /No instances yet/.test(ddoc.querySelector('#instances').textContent));
    check('dev-mode topups enabled', ddoc.querySelector('[data-topup]').disabled === false);
    dash.window.close();

    console.log('\nerrors captured across pages:');
    console.log(errors.length ? '  ' + errors.join('\n  ') : '  none');
  } finally {
    server.kill('SIGTERM');
  }

  console.log(`\nrender checks: FAIL=${failures}`);
  if (failures) { process.exit(1); }
  console.log('RENDER CHECKS PASSED');
}

main().catch((err) => { console.error(err); process.exit(1); });
