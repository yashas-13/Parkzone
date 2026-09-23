/* Status page - probes every public surface from the visitor's browser. */
(function () {
  'use strict';
  var PZ = window.PZ;
  var $ = PZ.qs;
  var REFRESH = 30;
  var countdown = REFRESH;

  function pill(row, state, text) {
    var el = PZ.qsa('.status-pill', row)[0];
    if (!el) { return; }
    el.className = 'status-pill status-' + state;
    el.textContent = text;
  }

  function rowFor(name) {
    var rows = PZ.qsa('.status-row');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].textContent.indexOf(name) === 0) { return rows[i]; }
    }
    return null;
  }

  function set(name, state, text) {
    var row = rowFor(name);
    if (row) { pill(row, state, text); }
  }

  function ms(fn) {
    var t = performance.now();
    return fn().then(function (v) { return { value: v, ms: Math.round(performance.now() - t) }; });
  }

  function probe() {
    ms(function () { return PZ.api('/health', { timeout: 8000 }); })
      .then(function (r) {
        set('API service', 'up', 'operational - ' + r.ms + ' ms');
        set('Marketplace database', String(r.value.db || '').toLowerCase() === 'up' ? 'up' : 'down',
          String(r.value.db || '').toLowerCase() === 'up' ? 'reachable' : 'unreachable');
        $('#statApi').textContent = 'v' + (r.value.version || '?');
      })
      .catch(function (e) {
        set('API service', 'down', e && e.status === 503 ? 'database down (503)' : 'unreachable');
        set('Marketplace database', 'down', 'unknown');
        $('#statApi').textContent = '-';
      });

    ms(function () { return PZ.api('/gpus', { timeout: 8000 }); })
      .then(function (r) {
        var n = Array.isArray(r.value) ? r.value.length : 0;
        set('Live GPU inventory', 'up', n ? 'operational - ' + n + ' hosting' : 'operational - no hosts parked');
        $('#statGpus').textContent = String(n);
        $('#statLatency').textContent = r.ms + ' ms';
      })
      .catch(function () {
        set('Live GPU inventory', 'down', 'unreachable');
        $('#statGpus').textContent = '-';
      });

    set('Website and assets', 'up', 'operational - this page loaded');

    PZ.api('/version', { timeout: 8000 })
      .then(function (v) { $('#snapTime').textContent = PZ.time(); if (v.dev_mode) { set('UPI and card payments', 'unknown', 'not live - payments pending'); } })
      .catch(function () { $('#snapTime').textContent = 'unavailable'; });

    fetch('/agent.exe', { method: 'HEAD' })
      .then(function (res) { set('Host agent download', res.ok ? 'up' : 'unknown', res.ok ? 'operational' : 'signed build not published yet'); })
      .catch(function () { set('Host agent download', 'unknown', 'not published yet'); });

    set('UPI and card payments', 'unknown', 'not live - payments pending');
  }

  PZ.ready(function () {
    PZ.init();
    probe();
    setInterval(function () {
      countdown -= 1;
      $('#snapCount').textContent = String(Math.max(0, countdown));
      if (countdown <= 0) { countdown = REFRESH; probe(); }
    }, 1000);
  });
})();
