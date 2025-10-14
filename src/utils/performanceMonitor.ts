// Performance monitor (dev only)
// Provides a simple FPS counter and exposes a setter for sync latency

let fps = 0;
let frames = 0;
let lastTime = performance.now();
let lastFpsUpdate = performance.now();
let rafId: number | null = null;

let latencyMs = 0;

const subscribers: Array<
  (metrics: { fps: number; latencyMs: number }) => void
> = [];

function notify() {
  const snapshot = { fps, latencyMs };
  subscribers.forEach((cb) => cb(snapshot));
}

function loop(now: number) {
  frames += 1;

  // Update FPS once per second for stability
  if (now - lastFpsUpdate >= 1000) {
    const delta = now - lastTime;
    fps = Math.round((frames * 1000) / delta);
    frames = 0;
    lastTime = now;
    lastFpsUpdate = now;
    notify();
  }

  rafId = requestAnimationFrame(loop);
}

export function startPerfMonitor() {
  if (import.meta.env.PROD) return () => {};
  if (rafId != null) return stopPerfMonitor; // already running
  lastTime = performance.now();
  lastFpsUpdate = lastTime;
  frames = 0;
  rafId = requestAnimationFrame(loop);
  return stopPerfMonitor;
}

export function stopPerfMonitor() {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
}

export function setSyncLatency(ms: number) {
  if (import.meta.env.PROD) return;
  latencyMs = Math.round(ms);
  notify();
}

export function subscribePerf(
  cb: (metrics: { fps: number; latencyMs: number }) => void
): () => void {
  subscribers.push(cb);
  // Send initial snapshot
  cb({ fps, latencyMs });
  return () => {
    const idx = subscribers.indexOf(cb);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}
