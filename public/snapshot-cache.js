(function () {
  const prefix = 'infinity-snapshot-v1:';
  window.infinitySnapshotCache = {
    get(key) {
      try {
        const parsed = JSON.parse(sessionStorage.getItem(prefix + key) || 'null');
        return parsed && parsed.data ? parsed : null;
      } catch (_) { return null; }
    },
    set(key, data, generatedAt) {
      try { sessionStorage.setItem(prefix + key, JSON.stringify({ data, generatedAt: generatedAt || new Date().toISOString(), storedAt: Date.now() })); } catch (_) {}
    },
    unwrap(raw) {
      const envelope = raw?.result || raw?.data || raw;
      return envelope && envelope.resource && Object.prototype.hasOwnProperty.call(envelope, 'data')
        ? { data: envelope.data, generatedAt: envelope.generatedAt, ageMs: envelope.ageMs }
        : { data: raw, generatedAt: null, ageMs: null };
    }
  };
})();
