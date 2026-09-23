/* Landing page - live marketplace, filters, map, calculator, rent flow. */
(function () {
  'use strict';
  var PZ = window.PZ;

  var state = { all: [], shown: [], chip: 'all', devMode: false, idle: 0, timer: null, pending: null, balance: null };
  var $ = PZ.qs;

  /* --------------------------------------------------------- live stats -- */
  function paintStats(stats) {
    var gpus = $('#statGpus'), cities = $('#statCities'), low = $('#statLow');
    var gpuCount = stats.gpus_online || 0;
    PZ.countUp(gpus, gpuCount);
    PZ.countUp(cities, (stats.cities || []).length);
    low.textContent = stats.min_price ? 'Rs ' + PZ.num(stats.min_price) : 'no hosts yet';
    $('#heroGpuCount').textContent = gpuCount === 1 ? '1 GPU online' : gpuCount + ' GPUs online';
    $('#navCount').textContent = gpuCount + ' online';
    if (stats.min_price) {
      var rate = $('#calcRate');
      if (rate && !rate.dataset.touched) { rate.value = stats.min_price; recalc(); }
    }
  }

  function paintTicker(rows) {
    var track = $('#tickerTrack');
    if (!track) { return; }
    if (!rows.length) {
      track.innerHTML = '<span class="ticker-item">No hosts online yet - <b>be the first to park a GPU</b></span>';
      return;
    }
    var items = rows.slice(0, 14).map(function (g) {
      return '<span class="ticker-item">' + PZ.esc(g.gpu_model) +
        ' <b>Rs ' + PZ.esc(g.display_price) + '/hr</b> ' + PZ.esc(g.city) +
        ' <span class="faint">' + PZ.esc(PZ.gb(g.vram)) + '</span></span>';
    }).join('');
    track.innerHTML = items + items; // duplicate for a seamless CSS loop
  }

  function paintCityCounts(rows) {
    var counts = {};
    rows.forEach(function (g) { counts[g.city] = (counts[g.city] || 0) + 1; });
    PZ.qsa('[data-city-count]').forEach(function (el) {
      var n = counts[el.getAttribute('data-city-count')] || 0;
      el.textContent = n ? n + ' online' : 'no host yet';
    });
  }

  /* ------------------------------------------------------------ cards --- */
  function gpuCard(g) {
    var tier = PZ.tier(g.gpu_model);
    var uptime = Math.max(0, Math.min(100, Math.round(g.uptime || 0)));
    var low = uptime < 90 ? ' is-low' : '';
    var series = PZ.priceHistory(g.host_id, g.display_price);
    var spark = series ? PZ.sparkline(series) : '';
    return '<article class="gpu">' +
      '<div class="gpu-top"><div>' +
        '<div class="gpu-name">' + PZ.esc(g.gpu_model) + '</div>' +
        '<div class="gpu-meta mt-2">' + PZ.esc(g.host_id) + ' - ' + PZ.esc(g.city) + '</div>' +
      '</div><span class="badge ' + tier.cls + '">' + tier.label + '</span></div>' +
      '<div class="gpu-specs"><span>' + PZ.esc(PZ.gb(g.vram)) + ' VRAM</span><span>CUDA ready</span><span>Docker isolated</span></div>' +
      '<div class="gpu-price"><b>Rs ' + PZ.esc(g.display_price) + '</b><span>/hour - ' +
        Math.ceil((Number(g.display_price) || 0) * 100 / 60) + ' paise/min</span></div>' +
      spark +
      '<div class="gpu-uptime"><span>Uptime</span><span class="mono neon">' + uptime + '%</span></div>' +
      '<div class="bar"><div class="bar-fill' + low + '" data-w="' + uptime + '"></div></div>' +
      '<button class="btn btn-primary btn-block mt-2" type="button" data-rent="' + PZ.esc(g.host_id) + '" data-gpu="' + PZ.esc(g.gpu_model) + '" data-price="' + PZ.esc(g.display_price) + '">Rent this GPU</button>' +
      '</article>';
  }

  function render() {
    var grid = $('#marketGrid');
    var q = ($('#q').value || '').trim().toLowerCase();
    var city = $('#city').value;
    var minVram = Number($('#minvram').value) || 0;
    var sort = $('#sort').value;
    var rows = state.all.filter(function (g) {
      var hay = (g.gpu_model + ' ' + g.city + ' ' + g.host_id + ' ' + PZ.gb(g.vram)).toLowerCase();
      if (q && hay.indexOf(q) === -1) { return false; }
      if (city && g.city !== city) { return false; }
      if (minVram && (Number(g.vram) || 0) < minVram) { return false; }
      if (state.chip !== 'all' && (g.gpu_model || '').toLowerCase().indexOf(state.chip.toLowerCase()) === -1) { return false; }
      return true;
    });
    rows.sort(function (a, b) {
      if (sort === 'price') { return a.display_price - b.display_price; }
      if (sort === 'vram') { return (b.vram || 0) - (a.vram || 0); }
      return (b.uptime || 0) - (a.uptime || 0);
    });
    state.shown = rows;
    grid.setAttribute('aria-busy', 'false');
    if (!rows.length) {
      grid.innerHTML = '<div class="empty"><div class="state-ico" aria-hidden="true">[]</div>' +
        '<b>' + (state.all.length ? 'No GPU matches those filters' : 'No hosts online right now') + '</b>' +
        '<p class="small muted mt-3">' + (state.all.length ? 'Try clearing the search or picking another city.' : 'The marketplace is quiet - yours could be the first GPU here.') + '</p>' +
        '<a class="btn btn-primary mt-4" href="/host">Park your GPU and earn</a></div>';
      return;
    }
    grid.innerHTML = rows.map(gpuCard).join('');
    PZ.qsa('.bar-fill', grid).forEach(function (el) { PZ.cssVar(el, '--w', (el.getAttribute('data-w') || 100) + '%'); });
    PZ.qsa('[data-rent]', grid).forEach(function (btn) {
      btn.addEventListener('click', function () {
        openRent(btn.getAttribute('data-rent'), btn.getAttribute('data-gpu'), btn.getAttribute('data-price'));
      });
    });
  }

  /* ------------------------------------------------------------- load ---- */
  function load(silent) {
    if (!silent) { PZ.skeletons($('#marketGrid'), 6); }
    return PZ.api('/gpus').then(function (rows) {
      state.all = Array.isArray(rows) ? rows : [];
      var cities = {};
      state.all.forEach(function (g) { cities[g.city] = 1; });
      var sel = $('#city'), keep = sel.value;
      sel.innerHTML = '<option value="">All cities</option>' + Object.keys(cities).sort().map(function (c) {
        return '<option value="' + PZ.esc(c) + '">' + PZ.esc(c) + '</option>';
      }).join('');
      if (keep) { sel.value = keep; }
      render();
      paintTicker(state.all);
      paintCityCounts(state.all);
      $('#heroUpdated').textContent = PZ.time();
      return PZ.api('/stats').then(paintStats);
    }).catch(function (err) {
      $('#marketGrid').setAttribute('aria-busy', 'false');
      $('#marketGrid').innerHTML = '<div class="error-state"><div class="state-ico" aria-hidden="true">!</div>' +
        '<b>Live marketplace is unreachable</b><p class="small muted mt-3">' + PZ.esc(err.message) +
        '</p><button class="btn btn-ghost mt-4" type="button" id="retryLoad">Try again</button></div>';
      var retry = $('#retryLoad');
      if (retry) { retry.addEventListener('click', function () { load(); }); }
    });
  }

  /* -------------------------------------------------------- auto refresh -- */
  function startPolling() {
    var counter = $('#refreshCount');
    state.idle = Math.round(PZ.pollMs / 1000);
    if (state.timer) { clearInterval(state.timer); }
    state.timer = setInterval(function () {
      state.idle -= 1;
      if (counter) { counter.textContent = String(Math.max(0, state.idle)); }
      if (state.idle <= 0) {
        state.idle = Math.round(PZ.pollMs / 1000);
        if (!document.hidden && !state.pending) { load(true); }
      }
    }, 1000);
  }

  /* ------------------------------------------------------------- modal --- */
  function key() {
    if (window.crypto && window.crypto.randomUUID) { return window.crypto.randomUUID().replace(/-/g, '').slice(0, 24); }
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function openRent(hostId, gpuName, price) {
    state.pending = { host_id: hostId, idle: key(), price: Number(price) || 0 };
    $('#rentGpu').textContent = gpuName;
    $('#rentHost').textContent = hostId + ' - ' + state.pending.price + ' Rs/hr';
    $('#rentRate').textContent = 'Rs ' + PZ.num(state.pending.price) + '/hr';
    $('#rentPerMin').textContent = Math.ceil(state.pending.price * 100 / 60) + ' paise';
    var email = PZ.email();
    if (email) { $('#rentEmail').value = email; refreshBalance(email); }
    var modal = $('#rentModal');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    var first = email ? $('#rentImage') : $('#rentEmail');
    setTimeout(function () { first.focus(); }, 30);
  }

  function closeRent() {
    var modal = $('#rentModal');
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    $('#rentEmailErr').hidden = true;
    $('#rentSubmit').disabled = false;
    $('#rentSubmit').textContent = 'Confirm and deploy';
    state.pending = null;
  }

  function refreshBalance(email) {
    if (!PZ.emailOk(email)) { $('#rentBalance').textContent = '-'; $('#rentHold').textContent = '-'; return; }
    PZ.api('/wallet?email=' + encodeURIComponent(email)).then(function (w) {
      state.balance = w.balance;
      $('#rentBalance').textContent = PZ.money(w.balance);
      var rate = state.pending ? state.pending.price : 0;
      var holdPaise = Math.ceil(rate * 100 / 60) * (w.hold_minutes || 10);
      $('#rentHold').textContent = PZ.money(holdPaise);
    }).catch(function () { $('#rentBalance').textContent = 'unavailable'; });
  }

  function submitRent(ev) {
    ev.preventDefault();
    if (!state.pending) { return; }
    var email = $('#rentEmail').value.trim();
    var err = $('#rentEmailErr');
    if (!PZ.emailOk(email)) {
      err.hidden = false;
      $('#rentEmail').setAttribute('aria-invalid', 'true');
      $('#rentEmail').focus();
      return;
    }
    err.hidden = true;
    $('#rentEmail').removeAttribute('aria-invalid');
    PZ.store.set(PZ.EMAIL_KEY, email);
    var btn = $('#rentSubmit');
    btn.disabled = true;
    btn.textContent = 'Deploying...';
    PZ.api('/rent', {
      method: 'POST',
      body: {
        host_id: state.pending.host_id,
        renter_email: email,
        docker_image: $('#rentImage').value,
        idempotency_key: state.pending.idle
      }
    }).then(function (instance) {
      PZ.toast('Instance ready - SSH issued', 'ok');
      closeRent();
      setTimeout(function () {
        window.location.href = '/dashboard?email=' + encodeURIComponent(email) + '&host_id=' + encodeURIComponent(instance.host_id || '');
      }, 700);
    }).catch(function (e) {
      btn.disabled = false;
      btn.textContent = 'Confirm and deploy';
      if (e.status === 402) {
        PZ.toast(e.message, 'err', 6000);
        if (state.devMode) { demoTopUp(email); }
        return;
      }
      PZ.toast(e.message || 'Rent failed', 'err', 6000);
    });
  }

  function demoTopUp(email) {
    PZ.api('/wallet/add', { method: 'POST', body: { email: email, amount: 50000, idempotency_key: key() } })
      .then(function (w) {
        $('#rentBalance').textContent = PZ.money(w.balance);
        PZ.toast('Demo credit added in dev mode. Press deploy again.', 'ok', 5000);
      })
      .catch(function () { PZ.toast('Could not add credit - contact support', 'err'); });
  }

  /* -------------------------------------------------------- calculator --- */
  var AWS_RATE = 98;
  function recalc() {
    var rate = Number($('#calcRate').value) || 0;
    var hours = Number($('#calcHours').value) || 0;
    var days = Number($('#calcDays').value) || 0;
    $('#calcRateOut').textContent = 'Rs ' + PZ.num(rate);
    $('#calcHoursOut').textContent = hours + 'h';
    $('#calcDaysOut').textContent = String(days);
    var cost = rate * hours * days;
    var aws = AWS_RATE * hours * days;
    $('#calcCost').textContent = 'Rs ' + PZ.num(cost);
    $('#calcAws').textContent = 'Rs ' + PZ.num(aws);
    $('#calcSave').textContent = aws > 0 ? Math.max(0, Math.round((1 - cost / aws) * 100)) + '%' : '0%';
  }

  /* --------------------------------------------------------------- wires -- */
  function wire() {
    ['calcRate', 'calcHours', 'calcDays'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) { return; }
      el.addEventListener('input', function () {
        if (id === 'calcRate') { el.dataset.touched = '1'; }
        recalc();
      });
    });
    recalc();

    ['q', 'city', 'sort', 'minvram'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) { return; }
      el.addEventListener(id === 'q' ? 'input' : 'change', PZ.debounce(render, id === 'q' ? 160 : 0));
    });

    var chips = PZ.qsa('#gpuChips .chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.chip = chip.getAttribute('data-chip') || 'all';
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        render();
      });
    });

    PZ.qsa('[data-city-node]').forEach(function (node) {
      function pick() {
        var city = node.getAttribute('data-city-node');
        var sel = $('#city');
        var match = PZ.qsa('option', sel).filter(function (o) { return o.value === city; })[0];
        if (!match) { PZ.toast('No hosts in ' + city + ' yet - link your GPU from the host page', 'err', 4600); return; }
        sel.value = city;
        render();
        $('.section#market').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      node.addEventListener('click', pick);
      node.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); }
      });
    });

    PZ.qsa('[data-deploy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var image = btn.getAttribute('data-deploy');
        if (!state.all.length) {
          PZ.toast('No hosts online right now - try again shortly', 'err');
          return;
        }
        // Pre-select the container the visitor asked for, priced off the
        // cheapest live host so the estimate is honest.
        openRent(state.all[0].host_id, state.all[0].gpu_model, state.all[0].display_price);
        $('#rentImage').value = image;
      });
    });

    var modal = $('#rentModal');
    modal.addEventListener('click', function (ev) { if (ev.target === modal) { closeRent(); } });
    PZ.qsa('[data-close-modal]').forEach(function (b) { b.addEventListener('click', closeRent); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !modal.hidden) { closeRent(); }
      if (ev.key === 'Tab' && !modal.hidden) {
        var focusable = PZ.qsa('a[href], button:not([disabled]), input, select, textarea', modal)
          .filter(function (el) { return el.offsetParent !== null; });
        if (!focusable.length) { return; }
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    });
    $('#rentForm').addEventListener('submit', submitRent);
    $('#rentEmail').addEventListener('blur', function () { refreshBalance($('#rentEmail').value.trim()); });

    document.addEventListener('visibilitychange', function () { if (!document.hidden) { load(true); } });
  }

  PZ.ready(function () {
    PZ.init();
    wire();
    load();
    startPolling();
    PZ.api('/version').then(function (v) { state.devMode = !!v.dev_mode; }).catch(function () {});
  });
})();
