export function registerPwa(): void {
  if (!("serviceWorker" in navigator)) return;
  if (!Boolean((import.meta as any).env?.PROD)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(error => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
