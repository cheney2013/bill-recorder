export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;
  const onControllerChange = () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // Check for updates on load and when window gains focus
      reg.update().catch(() => {});
      window.addEventListener('focus', () => reg.update().catch(() => {}));

      // If there's an updated SW waiting, tell it to take control immediately
      const forceActivate = () => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      };

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') forceActivate();
        });
      });

      // In case the SW is already waiting right after register
      forceActivate();
    } catch {
      // noop
    }
  });
}
