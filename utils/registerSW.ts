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

      const notifyUpdateAvailable = () => {
        // Only prompt if this is an update (i.e., there's an active controller already)
        if (navigator.serviceWorker.controller) {
          const ev = new CustomEvent<ServiceWorkerRegistration>('sw-update-available', { detail: reg });
          window.dispatchEvent(ev);
        }
      };

      // If there's an updated SW waiting after register
      if (reg.waiting) notifyUpdateAvailable();

      // Listen for new installing worker becoming installed
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') notifyUpdateAvailable();
        });
      });
    } catch {
      // noop
    }
  });
}
