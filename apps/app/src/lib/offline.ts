import { APP_VERSION } from "../version";

export async function prepareOffline(): Promise<void> {
  if (!("serviceWorker" in navigator)) throw new Error("Offline storage is not supported by this browser.");
  await invalidateShellForNewBuild();
  const registration = navigator.onLine
    ? await navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`, { updateViaCache: "none" })
    : await navigator.serviceWorker.ready;
  const installing = registration.installing || registration.waiting;
  if (installing && installing.state !== "activated") {
    await new Promise<void>((resolve, reject) => {
      const check = () => {
        if (installing.state === "activated" || installing.state === "redundant") {
          installing.removeEventListener("statechange", check);
          if (installing.state === "activated") resolve();
          else reject(new Error("Offline preparation failed."));
        }
      };
      installing.addEventListener("statechange", check);
      check();
    });
  }
  const ready = await navigator.serviceWorker.ready;
  const urls = performance.getEntriesByType("resource")
    .filter((entry) => ["script", "link", "css", "img"].includes((entry as PerformanceResourceTiming).initiatorType))
    .map((entry) => entry.name);
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error("Offline preparation timed out.")); }, 15000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      if (event.data.ok) resolve();
      else reject(new Error("Reconnect to finish preparing offline access."));
    };
    ready.active?.postMessage({ type: "PREPARE_OFFLINE", urls }, [channel.port2]);
  });
}

async function invalidateShellForNewBuild(): Promise<void> {
  const key = "qesuite-re:cached-build";
  try {
    if (window.localStorage.getItem(key) === APP_VERSION) return;
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("qesuite-re-shell-") || name.startsWith("qesuite-shell-")).map((name) => caches.delete(name)));
    }
    window.localStorage.removeItem("qesuite:cached-build");
    window.localStorage.setItem(key, APP_VERSION);
  } catch {
    // Private browsing can restrict cache or local storage. Registration still
    // proceeds and the worker's network-first strategy remains functional.
  }
}
