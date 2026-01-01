const EVENT_NAMES = [
  "abrantes:assignVariant",
  "abrantes:renderVariant",
  "abrantes:persist",
  "abrantes:track",
  "abrantes:formTrack",
];

const api = globalThis.browser ?? globalThis.chrome;

function safeClone(value) {
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      if (value === undefined) return null;
      return String(value);
    }
  }
}

function sendToBackground(payload) {
  try {
    const maybePromise = api.runtime.sendMessage({ type: "abrantes_event", payload });
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.catch(() => {});
    }
  } catch {
    // ignore
  }
}

function onAbrantesEvent(eventName, event) {
  const detail = safeClone(event?.detail);
  sendToBackground({
    eventName,
    timestamp: Date.now(),
    href: location.href,
    detail,
  });
}

for (const eventName of EVENT_NAMES) {
  document.addEventListener(
    eventName,
    (event) => onAbrantesEvent(eventName, event),
    true
  );
}
