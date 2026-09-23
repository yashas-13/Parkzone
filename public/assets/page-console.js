/* Renter console - wallet, instances, live burn rate, ledger, deploy and stop. */
(function () {
  'use strict';
  var PZ = window.PZ;
  var $ = PZ.qs;
  var state = { email: '', devMode: false, instances: [], hold: 10, timer: null, pending: {} };

  function money(paise) { return PZ.money(paise); }

  /* ------------------------------------------------------------- account -- */
  function resolveEmail() {
    var q = new URLSearchParams(window.location.search);
    var candidate = (q.get('email') || PZ.email() || '').trim();
    if (PZ.emailOk(candidate)) { return candidate; }
    return '';
  }

  function openConsole(email) {
    state.email = email;
    PZ.store.set(PZ.EMAIL_KEY, email);
    $('#gate').hidden = true;
    $('#console').hidden = false;
    $('#whoami').textContent = email;
    var host = new URLSearchParams(window.location.search).get('host_id');
    if (host) {
      $('#deployBox').hidden = false;
      $('#deployHost').textContent = host;
    }
    loadAll();
    if (state.timer) { clearInterval(state.timer); }
    state.timer = setInterval(function () {
      if (!document.hidden) { loadAll(true); }
    }, PZ.pollMs);
  }

  /* ---------------------------------------------------------------- load -- */
  function loadAll(silent) {
    if (!silent) {
      $('#instances').setAttribute('aria-busy', 'true');
      PZ.skeletons($('#instances'), 2);
    }
    return Promise.all([
      PZ.api('/wallet?email=' + encodeURIComponent(state.email)),
      PZ.api('/instances?email=' + encodeURIComponent(state.email)),
      PZ.api('/ledger?email=' + encodeURIComponent(state.email) + '&limit=25')
    ]).then(function (out) {
      var wallet = out[0], instances = out[1], ledger = out[2];
      state.hold = wallet.hold_minutes || 10;
      paintWallet(wallet);
      state.instances = Array.isArray(instances) ? instances : [];
      paintInstances(state.instances);
      paintLedger(Array.isArray(ledger) ? ledger : []);
      $('#liveState').textContent = 'live - ' + PZ.time();
    }).catch(function (err) {
      $('#instances').setAttribute('aria-busy', 'false');
      $('#instances').innerHTML = '<div class="error-state"><div class="state-ico" aria-hidden="true">!</div>' +
        '<b>Could not load your console</b><p class="small muted mt-3">' + PZ.esc(err.message) + '</p>' +
        '<button class="btn btn-ghost mt-4" type="button" id="retryConsole">Try again</button></div>';
      var retry = $('#retryConsole');
      if (retry) { retry.addEventListener('click', function () { loadAll(); }); }
    });
  }

  function paintWallet(w) {
    var paise = w.balance || 0;
    $('#balance').textContent = money(paise);
    $('#balanceHint').textContent = paise < 500
      ? 'Add credit to start an instance - the smallest top-up is Rs 5.'
      : 'Credit is consumed only while an instance runs, per started minute.';
    PZ.qsa('[data-topup]').forEach(function (btn) {
      btn.disabled = !state.devMode;
      if (!state.devMode) { btn.classList.add('btn-quiet'); btn.classList.remove('btn-primary'); }
    });
    $('#topupNote').textContent = state.devMode
      ? 'Development mode: credits are applied instantly for testing.'
      : 'Top-ups via UPI and cards land with the Razorpay release. Mail support@parkzone.in to fund an account manually in the meantime.';
  }

  function minutesSince(iso) {
    if (!iso) { return 1; }
    var started = new Date(iso).getTime();
    if (!started) { return 1; }
    return Math.max(1, Math.ceil((Date.now() - started) / 60000));
  }

  function paintInstances(rows) {
    var grid = $('#instances');
    grid.setAttribute('aria-busy', 'false');
    var running = rows.filter(function (r) { return r.status === 'running' || r.status === 'starting' || r.status === 'provisioning'; });
    var burn = running.reduce(function (sum, r) { return sum + (r.cost_per_minute || 0); }, 0);
    var spend = 0;
    rows.forEach(function (r) { spend += Number(r.charged_paise || 0); });
    PZ.countUp($('#statRunning'), running.length);
    PZ.countUp($('#statTotal'), rows.length);
    $('#statSpend').textContent = money(spend);
    $('#statBurn').textContent = money(burn) + '/min';

    if (!rows.length) {
      grid.innerHTML = '<div class="empty"><div class="state-ico" aria-hidden="true">[]</div>' +
        '<b>No instances yet</b><p class="small muted mt-3">Pick a GPU from the live marketplace and it appears here with SSH and Jupyter endpoints.</p>' +
        '<a class="btn btn-primary mt-4" href="/#market">Rent your first GPU</a></div>';
      return;
    }
    grid.innerHTML = rows.map(card).join('');
    PZ.qsa('[data-stop]', grid).forEach(function (btn) {
      btn.addEventListener('click', function () { armStop(btn, btn.getAttribute('data-stop')); });
    });
    PZ.qsa('[data-copy-value]', grid).forEach(function (btn) {
      btn.addEventListener('click', function () { PZ.copy(btn.getAttribute('data-copy-value'), btn); });
    });
    tick();
  }

  function card(x) {
    var live = x.status === 'running' || x.status === 'starting' || x.status === 'provisioning';
    var mins = minutesSince(x.started_at);
    var spent = mins * (x.cost_per_minute || 0);
    var badge = live ? 'badge badge-live' : 'badge';
    return '<article class="inst' + (live ? ' is-running' : '') + '">' +
      '<div class="card-head"><span class="mono bold">' + PZ.esc(x.host_id || 'unassigned') + '</span>' +
      '<span class="' + badge + '">' + PZ.esc(x.status) + '</span></div>' +
      '<div class="kv">' +
        '<div class="kv-row"><span>Image</span><span class="mono tiny">' + PZ.esc(x.docker_image || '-') + '</span></div>' +
        '<div class="kv-row"><span>Rate</span><span>' + money(x.cost_per_minute) + '/min</span></div>' +
        '<div class="kv-row"><span>' + (live ? 'Elapsed / spent' : 'Final charge') + '</span><span data-elapsed="' + PZ.esc(x.instance_id) + '">' +
          (live ? mins + ' min - ' + money(spent) : PZ.esc(String(x.minutes || 1)) + ' min') + '</span></div>' +
      '</div>' +
      '<div><p class="label">SSH</p><div class="code-row"><code>' + PZ.esc(x.ssh) + '</code>' +
        '<button class="btn btn-quiet btn-sm" type="button" data-copy-value="' + PZ.esc(x.ssh) + '">Copy</button></div></div>' +
      '<div><p class="label">Jupyter</p><div class="code-row"><code>' + PZ.esc(x.jupyter) + '</code>' +
        '<button class="btn btn-quiet btn-sm" type="button" data-copy-value="' + PZ.esc(x.jupyter) + '">Copy</button></div></div>' +
      (live
        ? '<button class="btn btn-danger btn-block mt-2" type="button" data-stop="' + PZ.esc(x.instance_id) + '">Stop instance</button>'
        : '<p class="tiny faint">Stopped - billing closed.</p>') +
      '</article>';
  }

  /* Live cost ticker: recomputed every 15s from the local clock (no API call). */
  function tick() {
    state.instances.forEach(function (x) {
      if (x.status !== 'running' && x.status !== 'starting' && x.status !== 'provisioning') { return; }
      var el = PZ.qs('[data-elapsed="' + x.instance_id + '"]');
      if (!el) { return; }
      var mins = minutesSince(x.started_at);
      el.textContent = mins + ' min - ' + money(mins * (x.cost_per_minute || 0));
    });
  }

  function paintLedger(rows) {
    var box = $('#ledger');
    if (!rows.length) {
      box.innerHTML = '<p class="small muted">No activity yet. Top-ups, instance starts and per-minute charges will appear here.</p>';
      return;
    }
    box.innerHTML = rows.map(function (r) {
      var pos = (r.paise || 0) >= 0;
      return '<div class="ledger-row"><div><div>' + PZ.esc(label(r.kind)) + '</div>' +
        '<div class="tiny faint mono">' + PZ.esc(PZ.relative(r.created_at)) + (r.host_id ? ' - ' + PZ.esc(r.host_id) : '') + '</div></div>' +
        '<span class="' + (pos ? 'amt-pos' : 'amt-neg') + '">' + (pos ? '+' : '-') + money(Math.abs(r.paise || 0)) + '</span></div>';
    }).join('');
  }

  function label(kind) {
    return ({ topup: 'Wallet top-up', instance_created: 'Instance started', instance_stopped: 'Instance stopped' })[kind] || kind;
  }

  /* --------------------------------------------------------------- actions -- */
  function armStop(btn, instanceId) {
    if (btn.dataset.armed !== '1') {
      btn.dataset.armed = '1';
      btn.textContent = 'Tap again to stop';
      setTimeout(function () { btn.dataset.armed = '0'; btn.textContent = 'Stop instance'; }, 4000);
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Stopping...';
    PZ.api('/stop', { method: 'POST', body: { instance_id: instanceId, renter_email: state.email } })
      .then(function (res) {
        PZ.toast('Stopped after ' + res.minutes + ' min - charged ' + money(res.charged_paise), 'ok', 5000);
        loadAll();
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.dataset.armed = '0';
        btn.textContent = 'Stop instance';
        PZ.toast(e.message || 'Could not stop instance', 'err', 6000);
      });
  }

  function topUp(paise) {
    PZ.api('/wallet/add', {
      method: 'POST',
      body: { email: state.email, amount: paise, idempotency_key: 'top' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
    }).then(function (w) {
      PZ.toast('Added ' + money(paise) + ' - balance ' + money(w.balance), 'ok');
      loadAll(true);
    }).catch(function (e) { PZ.toast(e.message || 'Top-up failed', 'err', 6000); });
  }

  function deploy() {
    var host = new URLSearchParams(window.location.search).get('host_id');
    if (!host) { return; }
    var btn = $('#deployBtn');
    btn.disabled = true;
    btn.textContent = 'Deploying...';
    PZ.api('/rent', {
      method: 'POST',
      body: {
        host_id: host,
        renter_email: state.email,
        docker_image: $('#deployImage').value,
        idempotency_key: 'rent' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      }
    }).then(function (inst) {
      PZ.toast('Deployed on ' + inst.host_id + ' - ' + inst.ssh, 'ok', 6000);
      btn.disabled = false;
      btn.textContent = 'Deploy now';
      $('#deployBox').hidden = true;
      loadAll();
    }).catch(function (e) {
      btn.disabled = false;
      btn.textContent = 'Deploy now';
      PZ.toast(e.message || 'Deploy failed', 'err', 6000);
    });
  }

  /* ------------------------------------------------------------------ wires -- */
  PZ.ready(function () {
    PZ.init();
    $('#gateForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var value = $('#gateEmail').value.trim();
      if (!PZ.emailOk(value)) {
        $('#gateErr').hidden = false;
        $('#gateEmail').setAttribute('aria-invalid', 'true');
        $('#gateEmail').focus();
        return;
      }
      $('#gateErr').hidden = true;
      history.replaceState(null, '', '/dashboard?email=' + encodeURIComponent(value));
      openConsole(value);
    });
    $('#switchAccount').addEventListener('click', function () {
      PZ.store.del(PZ.EMAIL_KEY);
      history.replaceState(null, '', '/dashboard');
      $('#console').hidden = true;
      $('#gate').hidden = false;
      if (state.timer) { clearInterval(state.timer); }
      $('#gateEmail').value = '';
      $('#gateEmail').focus();
    });
    $('#refreshBtn').addEventListener('click', function () { loadAll(); PZ.toast('Refreshed', 'ok', 1600); });
    PZ.qsa('[data-topup]').forEach(function (btn) {
      btn.addEventListener('click', function () { topUp(Number(btn.getAttribute('data-topup'))); });
    });
    $('#deployBtn').addEventListener('click', deploy);
    setInterval(tick, 15000);

    var email = resolveEmail();
    if (email) { openConsole(email); } else { $('#gateEmail').focus(); }
    PZ.api('/version').then(function (v) { state.devMode = !!v.dev_mode; if (state.email) { loadAll(true); } }).catch(function () {});
  });
})();
