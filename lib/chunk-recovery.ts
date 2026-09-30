const RELOAD_KEY = 'motionify:stale-chunk-reload-at';
const RELOAD_WINDOW_MS = 30_000;

export function claimChunkReload(): boolean {
  try {
    const now = Date.now();
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_KEY));
    if (lastReloadAt > 0 && now - lastReloadAt < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    // Without persistent storage, an automatic reload cannot be bounded across page loads.
    return false;
  }
}
