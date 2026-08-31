(function () {
  const SNAPSHOT_KEY = 'infinity.video-status-snapshot.v1';
  const FEED_KEY = 'infinity.activity-feed.v1';
  const LAST_POLL_KEY = 'infinity.last-activity-poll.v1';
  const POLL_LEASE_KEY = 'infinity.activity-poll-lease.v1';
  const POLL_INTERVAL_MS = 60_000;
  const MIN_POLL_GAP_MS = 45_000;
  const MAX_FEED_ITEMS = 30;
  const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let deferredInstallPrompt = null;
  let polling = false;

  const isLogin = () => window.location.pathname.toLowerCase().replace(/\/+$/, '') === '/login';
  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
  };
  const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  function extractVideos(payload) {
    const root = payload?.result || payload?.data || payload;
    if (Array.isArray(root)) return root;
    if (Array.isArray(root?.items)) return root.items;
    if (Array.isArray(root?.videos)) return root.videos;
    if (Array.isArray(root?.data)) return root.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.videos)) return payload.videos;
    return [];
  }

  function normalizeVideo(row) {
    const id = String(row?.videoId || row?.id || row?.video_id || '').trim();
    if (!id) return null;
    return {
      id,
      title: String(row?.title || row?.topic || row?.scriptPreview || 'Video').split('\n')[0].trim(),
      status: String(row?.productionStatus || row?.status || row?.state || '').trim(),
      editor: String(row?.editor || row?.assignedTo || '').trim(),
      sla: String(row?.slaStatus || row?.sla || '').trim(),
      qcStatus: String(row?.qcStatus || row?.['QC Status'] || '').trim(),
      qcNotes: String(row?.qcChangeNotes || row?.qcNotes || row?.['QC Change Notes'] || row?.['QC Notes'] || '').trim(),
      blocker: String(row?.blocker || row?.Blocker || '').trim(),
      lastErrorAt: String(row?.lastErrorAt || row?.['Last Error At'] || '').trim(),
      rawReady: Boolean(row?.rawFileUrl || row?.rawLink || row?.rawUrl),
      finalReady: Boolean(row?.finalFileUrl || row?.finalLink || row?.finalUrl)
    };
  }

  function activityFor(previous, current) {
    if (!previous) return null;
    const statusChanged = previous.status !== current.status;
    const editorChanged = previous.editor !== current.editor;
    const slaChanged = previous.sla !== current.sla;
    const qcChanged = previous.qcStatus !== current.qcStatus || previous.qcNotes !== current.qcNotes;
    const blockerChanged = previous.blocker !== current.blocker || previous.lastErrorAt !== current.lastErrorAt;
    const normalizedStatus = `${current.status} ${current.qcStatus}`.toLowerCase();

    if (statusChanged && /change|revision|rework/.test(normalizedStatus)) {
      return { level: 'urgent', title: `Changes required · ${current.id}`, message: current.qcNotes || `${previous.status || 'Previous stage'} → ${current.status}` };
    }
    if ((statusChanged || qcChanged) && /qc|review/.test(normalizedStatus)) {
      return { level: 'qc', title: `QC update · ${current.id}`, message: current.qcNotes || current.status || current.qcStatus };
    }
    if (qcChanged && current.qcNotes) {
      return { level: 'qc', title: `QC notes updated · ${current.id}`, message: current.qcNotes };
    }
    if (blockerChanged && (current.blocker || current.lastErrorAt)) {
      return { level: 'urgent', title: `Workflow problem · ${current.id}`, message: current.blocker || `Last error: ${current.lastErrorAt}` };
    }
    if (slaChanged && /overdue|blocked|breach/.test(current.sla.toLowerCase())) {
      return { level: 'urgent', title: `SLA alert · ${current.id}`, message: current.sla };
    }
    if (editorChanged) {
      return { level: 'normal', title: `Editor changed · ${current.id}`, message: `${previous.editor || 'Unassigned'} → ${current.editor || 'Unassigned'}` };
    }
    if (!previous.rawReady && current.rawReady) {
      return { level: 'normal', title: `RAW ready · ${current.id}`, message: 'RAW file is now available.' };
    }
    if (!previous.finalReady && current.finalReady) {
      return { level: 'qc', title: `Final ready · ${current.id}`, message: 'Final file is ready for QC.' };
    }
    if (statusChanged) {
      return { level: 'normal', title: `Stage moved · ${current.id}`, message: `${previous.status || 'New'} → ${current.status || 'Updated'}` };
    }
    return null;
  }

  function acquirePollLease() {
    const now = Date.now();
    const lease = readJson(POLL_LEASE_KEY, null);
    if (lease?.until > now && lease?.tabId !== TAB_ID) return false;
    writeJson(POLL_LEASE_KEY, { tabId: TAB_ID, until: now + 80_000 });
    return readJson(POLL_LEASE_KEY, {})?.tabId === TAB_ID;
  }

  function getFeed() {
    const feed = readJson(FEED_KEY, []);
    return Array.isArray(feed) ? feed : [];
  }

  function storeActivities(activities) {
    if (!activities.length) return;
    const now = new Date().toISOString();
    const incoming = activities.map((item, index) => ({ ...item, key: `${Date.now()}-${index}`, at: now, unread: true }));
    writeJson(FEED_KEY, [...incoming, ...getFeed()].slice(0, MAX_FEED_ITEMS));
    renderFeed();
  }

  async function showSystemNotification(activity) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options = {
      body: activity.message,
      icon: '/icons/infinity-192.png',
      badge: '/icons/infinity-192.png',
      tag: `infinity-${activity.title}`,
      renotify: true,
      data: { url: `/videos?video=${encodeURIComponent(activity.id || '')}` }
    };
    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(activity.title, options);
        return;
      }
      const notification = new Notification(activity.title, options);
      notification.onclick = () => { window.focus(); window.location.href = options.data.url; };
    } catch {}
  }

  async function processVideoRows(rows) {
    const currentList = rows.map(normalizeVideo).filter(Boolean);
    const current = Object.fromEntries(currentList.map((video) => [video.id, video]));
    const previous = readJson(SNAPSHOT_KEY, null);
    writeJson(SNAPSHOT_KEY, current);
    localStorage.setItem(LAST_POLL_KEY, new Date().toISOString());
    window.dispatchEvent(new CustomEvent('infinity:videos-updated', { detail: { rows } }));

    if (!previous || typeof previous !== 'object') return;
    const activities = currentList.map((video) => {
      const activity = previous[video.id]
        ? activityFor(previous[video.id], video)
        : { level: 'normal', title: `New video added · ${video.id}`, message: video.status || 'Added to the pipeline.' };
      return activity ? { ...activity, id: video.id } : null;
    }).filter(Boolean).slice(0, 8);
    if (!activities.length) return;

    storeActivities(activities);
    activities.filter((item) => item.level === 'urgent' || item.level === 'qc').slice(0, 3).forEach(showSystemNotification);
    window.showToast?.(`${activities.length} new pipeline update${activities.length > 1 ? 's' : ''}`, 'info');
  }

  async function pollActivity() {
    const lastPoll = Date.parse(localStorage.getItem(LAST_POLL_KEY) || '') || 0;
    if (Date.now() - lastPoll < MIN_POLL_GAP_MS) return;
    if (polling || document.hidden || !navigator.onLine || isLogin() || !acquirePollLease()) return;
    polling = true;
    try {
      const response = await fetch('/api/infinity', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'videos', refresh: true, limit: 500 })
      });
      if (response.status === 401) return;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) return;

      await processVideoRows(extractVideos(payload));
    } catch {
      // Foreground pages already own visible API errors; retry silently later.
    } finally {
      polling = false;
    }
  }

  function renderFeed() {
    const feedRoot = document.getElementById('notification-feed');
    const badge = document.getElementById('notification-badge');
    const feed = getFeed();
    const unread = feed.filter((item) => item.unread).length;
    if (badge) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.hidden = unread === 0;
    }
    if (!feedRoot) return;
    if (!feed.length) {
      feedRoot.innerHTML = '<div class="notification-empty"><strong>All quiet</strong><span>QC, Changes and stage movement will appear here.</span></div>';
      return;
    }
    feedRoot.innerHTML = feed.map((item) => `
      <a class="notification-item notification-${escapeHtml(item.level)} ${item.unread ? 'is-unread' : ''}" href="/videos?video=${encodeURIComponent(item.id || '')}">
        <span class="notification-item-dot"></span>
        <span class="notification-item-copy">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.message)}</span>
          <time>${new Date(item.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
        </span>
      </a>
    `).join('');
  }

  function updatePermissionUi() {
    const status = document.getElementById('notification-status-text');
    const button = document.getElementById('enable-notifications-btn');
    if (!status || !button) return;
    if (!('Notification' in window)) {
      status.textContent = 'Browser alerts are not supported here.';
      button.hidden = true;
    } else if (Notification.permission === 'granted') {
      status.textContent = 'Phone/PC alerts enabled · checks every 60 sec';
      button.textContent = 'Enabled';
      button.disabled = true;
    } else if (Notification.permission === 'denied') {
      status.textContent = 'Blocked in browser settings.';
      button.textContent = 'Blocked';
      button.disabled = true;
    } else {
      status.textContent = 'Enable alerts on this device.';
      button.textContent = 'Enable';
      button.disabled = false;
    }
  }

  function setPanel(open) {
    const panel = document.getElementById('notification-panel');
    const bell = document.getElementById('notification-bell-btn');
    if (!panel || !bell) return;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    bell.setAttribute('aria-expanded', String(open));
    if (open) {
      writeJson(FEED_KEY, getFeed().map((item) => ({ ...item, unread: false })));
      renderFeed();
    }
  }

  function setupNotificationUi() {
    const bell = document.getElementById('notification-bell-btn');
    const panel = document.getElementById('notification-panel');
    bell?.addEventListener('click', () => setPanel(!panel?.classList.contains('open')));
    document.getElementById('notification-panel-close')?.addEventListener('click', () => setPanel(false));
    document.getElementById('enable-notifications-btn')?.addEventListener('click', async () => {
      if (!('Notification' in window)) return;
      const permission = await Notification.requestPermission();
      updatePermissionUi();
      if (permission === 'granted') {
        window.showToast?.('QC and Changes alerts enabled on this device.', 'success');
        pollActivity();
      }
    });
    document.getElementById('clear-notifications-btn')?.addEventListener('click', () => {
      writeJson(FEED_KEY, []);
      renderFeed();
    });
    document.addEventListener('click', (event) => {
      if (panel?.classList.contains('open') && !panel.contains(event.target) && !bell?.contains(event.target)) setPanel(false);
    });
    updatePermissionUi();
    renderFeed();
  }

  function setupInstallUi() {
    const button = document.getElementById('install-app-btn');
    if (!button || window.matchMedia('(display-mode: standalone)').matches) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) button.hidden = false;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      button.hidden = false;
    });
    button.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        button.hidden = true;
      } else if (isIos) {
        window.showToast?.('iPhone: Share button → Add to Home Screen', 'info');
      }
    });
    window.addEventListener('appinstalled', () => {
      button.hidden = true;
      window.showToast?.('Infinity Operations installed.', 'success');
    });
  }

  async function init() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    setupInstallUi();
    if (isLogin()) return;
    setupNotificationUi();
    window.__ingestInfinityVideos = (rows) => {
      if (Array.isArray(rows)) processVideoRows(rows);
    };
    const lastPoll = Date.parse(localStorage.getItem(LAST_POLL_KEY) || '') || 0;
    const initialDelay = Math.max(8_000, POLL_INTERVAL_MS - (Date.now() - lastPoll));
    window.setTimeout(pollActivity, initialDelay);
    window.setInterval(pollActivity, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pollActivity(); });
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
