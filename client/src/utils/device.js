const STORAGE_KEY = 'edupulse_device_id';

let memoryFallback = null;

function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `fp_${crypto.randomUUID()}`;
    }
  } catch {
    // fall through
  }

  return `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Stable per-browser identifier used by the anti-proxy device check.
 * User-agent strings are shared by thousands of devices, so they are not used.
 */
export function getDeviceFingerprint() {
  if (memoryFallback) return memoryFallback;

  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    memoryFallback = id;
    return id;
  } catch {
    memoryFallback = generateId();
    return memoryFallback;
  }
}
