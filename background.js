const EVENT_NAMES = [
  "abrantes:assignVariant",
  "abrantes:renderVariant",
  "abrantes:persist",
  "abrantes:track",
  "abrantes:formTrack",
];

const api = globalThis.browser ?? globalThis.chrome;

function promisifyChrome(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (result) => {
      const err = api?.runtime?.lastError;
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function hasPromiseApi() {
  return (
    typeof globalThis.browser !== "undefined" &&
    typeof globalThis.browser.runtime?.sendMessage === "function"
  );
}

const ext = {
  async storageGet(keys) {
    if (hasPromiseApi()) return api.storage.local.get(keys);
    return promisifyChrome(api.storage.local.get.bind(api.storage.local), keys);
  },
  async storageSet(items) {
    if (hasPromiseApi()) return api.storage.local.set(items);
    return promisifyChrome(api.storage.local.set.bind(api.storage.local), items);
  },
  async storageRemove(keys) {
    if (hasPromiseApi()) return api.storage.local.remove(keys);
    return promisifyChrome(api.storage.local.remove.bind(api.storage.local), keys);
  },
  async tabsQuery(queryInfo) {
    if (hasPromiseApi()) return api.tabs.query(queryInfo);
    return promisifyChrome(api.tabs.query.bind(api.tabs), queryInfo);
  },
  sendMessage(message) {
    try {
      const maybePromise = api.runtime.sendMessage(message);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch(() => {});
      }
    } catch {
      // ignore if no listeners (e.g. popup closed)
    }
  },
};

function emptyTabState() {
  const events = {};
  for (const name of EVENT_NAMES) {
    events[name] = { count: 0, last: null };
  }
  return { events, history: [] };
}

function storageKeyForTab(tabId) {
  return `tabState:${tabId}`;
}

const inMemory = new Map();

async function getTabState(tabId) {
  if (inMemory.has(tabId)) return inMemory.get(tabId);

  const key = storageKeyForTab(tabId);
  const data = await ext.storageGet(key).catch(() => ({}));
  const state = data?.[key] ?? emptyTabState();
  inMemory.set(tabId, state);
  return state;
}

async function setTabState(tabId, state) {
  inMemory.set(tabId, state);
  const key = storageKeyForTab(tabId);
  await ext.storageSet({ [key]: state }).catch(() => {});
}

function sanitizeHistory(history) {
  const MAX = 100;
  if (!Array.isArray(history)) return [];
  if (history.length <= MAX) return history;
  return history.slice(history.length - MAX);
}

async function recordEvent(tabId, payload) {
  const state = await getTabState(tabId);
  if (!state.events) state.events = emptyTabState().events;
  if (!state.history) state.history = [];

  if (!state.events[payload.eventName]) {
    state.events[payload.eventName] = { count: 0, last: null };
  }

  state.events[payload.eventName].count += 1;
  state.events[payload.eventName].last = payload;
  state.history.push(payload);
  state.history = sanitizeHistory(state.history);

  await setTabState(tabId, state);
  ext.sendMessage({ type: "abrantes_event_update", tabId, state });
}

async function clearTab(tabId) {
  inMemory.delete(tabId);
  await ext.storageRemove(storageKeyForTab(tabId)).catch(() => {});
  ext.sendMessage({ type: "abrantes_event_update", tabId, state: emptyTabState() });
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message !== "object") return;

    if (message.type === "abrantes_event") {
      const tabId = sender?.tab?.id;
      if (typeof tabId !== "number") return;
      await recordEvent(tabId, message.payload);
      return;
    }

    if (message.type === "get_tab_state") {
      const tabId = message.tabId;
      if (typeof tabId !== "number") {
        sendResponse({ ok: false, error: "Missing tabId" });
        return;
      }
      const state = await getTabState(tabId);
      sendResponse({ ok: true, state });
      return;
    }

    if (message.type === "clear_tab_state") {
      const tabId = message.tabId;
      if (typeof tabId !== "number") {
        sendResponse({ ok: false, error: "Missing tabId" });
        return;
      }
      await clearTab(tabId);
      sendResponse({ ok: true });
      return;
    }
  })().catch((err) => {
    try {
      sendResponse({ ok: false, error: String(err?.message ?? err) });
    } catch {
      // ignore
    }
  });

  return true;
});

if (api.tabs?.onRemoved) {
  api.tabs.onRemoved.addListener((tabId) => {
    clearTab(tabId).catch(() => {});
  });
}
