/*
 * pwa.js (Parte 5)
 * Registro do Service Worker e UX leve para instalação.
 */

(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js');
    } catch (err) {
      // Falhar silenciosamente (PWA é opcional)
      console.warn('SW register failed', err);
    }
  });
})();
