/**
 * app.js — Main application: connects office scene with status data
 */
(function () {
  // Initialize office scene
  const office = new OfficeScene('office');
  const fetcher = new StatusFetcher();

  // Update status bar from data
  function updateStatusBar(data) {
    if (!data) return;

    const setPill = (id, label, ok) => {
      const el = document.getElementById(id);
      el.textContent = label;
      el.className = 'status-pill ' + (ok === true ? 'ok' : ok === false ? 'err' : 'warn');
    };

    // Gateway
    if (data.gateway) {
      const gwOk = data.gateway.status === 'running' || data.gateway.status === 'ok' || data.gateway.ok === true;
      setPill('gw-pill', 'Gateway: ' + (gwOk ? 'Running' : 'Offline'), gwOk);
    }

    // Channels - handle nested structure from collect-status.sh
    const channels = data.channels;
    if (channels) {
      // Telegram
      let tgOk = null;
      if (channels.telegram) {
        if (typeof channels.telegram === 'object' && channels.telegram.running !== undefined) {
          tgOk = channels.telegram.running;
        } else if (channels.telegram.status) {
          tgOk = channels.telegram.status === 'running' || channels.telegram.status === 'ok';
        }
      }
      if (channels.channels && channels.channels.telegram) {
        tgOk = channels.channels.telegram.running;
      }
      setPill('tg-pill', 'Telegram: ' + (tgOk ? 'Running' : tgOk === false ? 'Off' : '--'), tgOk);

      // LINE
      let lineOk = null;
      if (channels.line) {
        if (typeof channels.line === 'object' && channels.line.running !== undefined) {
          lineOk = channels.line.running;
        } else if (channels.line.status) {
          lineOk = channels.line.status === 'running' || channels.line.status === 'ok';
        }
      }
      if (channels.channels && channels.channels.line) {
        lineOk = channels.channels.line.running;
      }
      setPill('line-pill', 'LINE: ' + (lineOk ? 'Running' : lineOk === false ? 'Off' : '--'), lineOk);
    }

    // Version
    if (data.version) {
      document.title = '⚡ Nexus Office — ' + data.version;
    }

    // Agent count
    document.getElementById('agent-count').textContent = office.agents.length + ' Agents';
  }

  // Clock
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = h + ':' + m + ':' + s;
  }

  // Initialize
  fetcher.onChange(updateStatusBar);
  fetcher.startPolling();
  office.start();

  updateClock();
  setInterval(updateClock, 1000);
})();
