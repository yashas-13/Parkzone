/* Host page - earnings calculator, live demand telemetry, agent download check. */
(function () {
  'use strict';
  var PZ = window.PZ;
  var $ = PZ.qs;
  var POWER_W = 300;
  var RATE_PER_UNIT = 9;   // Rs per kWh, typical Indian domestic tariff
  var MARKUP = 1.38;       // mirrors PZ_MARKUP on the API side

  function recalc() {
    var rate = Number($('#hRate').value) || 0;
    var hours = Number($('#hHours').value) || 0;
    var days = Number($('#hDays').value) || 0;
    $('#hRateOut').textContent = 'Rs ' + PZ.num(rate);
    $('#hHoursOut').textContent = hours + 'h';
    $('#hDaysOut').textContent = String(days);

    var gross = rate * hours * days;
    var renterRate = Math.ceil(rate * MARKUP);
    var renterPays = renterRate * hours * days;
    var kwh = (POWER_W / 1000) * hours * days;
    var power = Math.round(kwh * RATE_PER_UNIT);
    var net = gross - power;

    $('#hEarn').textContent = 'Rs ' + PZ.num(gross);
    $('#hRenter').textContent = 'Rs ' + PZ.num(renterPays);
    $('#hPower').textContent = 'Rs ' + PZ.num(power);
    var netEl = $('#hNet');
    netEl.textContent = 'Rs ' + PZ.num(net);
    netEl.className = net > 0 ? 'neon bold' : 'danger bold';
  }

  function demand() {
    PZ.api('/stats').then(function (s) {
      var n = s.gpus_online || 0;
      PZ.countUp($('#demandGpus'), n);
      PZ.countUp($('#liveCount'), n);
      PZ.countUp($('#demandCities'), (s.cities || []).length);
      $('#demandAvg').textContent = s.avg_price ? 'Rs ' + PZ.num(s.avg_price) : 'none yet';
      $('#liveLow').textContent = s.min_price ? 'Rs ' + PZ.num(s.min_price) : '-';
      $('#liveHigh').textContent = s.max_price ? 'Rs ' + PZ.num(s.max_price) : '-';
      $('#liveUptime').textContent = (s.avg_uptime === null || s.avg_uptime === undefined) ? '-' : s.avg_uptime + '%';
      $('#hostDemand').textContent = n + ' online';
      $('#liveUpdated').textContent = 'Marketplace snapshot taken at ' + PZ.time() + '. Refreshes automatically.';
      if (s.min_price && !$('#hRate').dataset.touched) {
        $('#hRate').value = Math.max(5, Math.round(s.min_price / MARKUP));
        recalc();
      }
    }).catch(function (err) {
      $('#liveUpdated').textContent = 'Marketplace data unavailable right now: ' + err.message;
      $('#hostDemand').textContent = 'status unknown';
    });
  }

  /* An unbuilt agent.exe would be a dead download - say so instead. */
  function agentAvailability() {
    fetch('/agent.exe', { method: 'HEAD' }).then(function (res) {
      if (res.ok) { return; }
      throw new Error('not published');
    }).catch(function () {
      PZ.qsa('a[href="/agent.exe"]').forEach(function (link) {
        link.setAttribute('aria-disabled', 'true');
        link.classList.remove('btn-primary');
        link.classList.add('btn-quiet');
        link.removeAttribute('href');
        link.textContent = 'Agent build coming soon';
      });
      var meta = $('#agentMeta');
      if (meta) { meta.textContent = 'The signed Windows build is not published yet - mail hosts@parkzone.in to join the pilot.'; }
    });
  }

  PZ.ready(function () {
    PZ.init();
    ['hRate', 'hHours', 'hDays'].forEach(function (id) {
      var el = $('#' + id);
      if (!el) { return; }
      el.addEventListener('input', function () {
        if (id === 'hRate') { el.dataset.touched = '1'; }
        recalc();
      });
    });
    recalc();
    demand();
    agentAvailability();
    setInterval(demand, PZ.pollMs);
  });
})();
