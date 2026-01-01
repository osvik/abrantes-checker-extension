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
  async tabsQuery(queryInfo) {
    if (hasPromiseApi()) return api.tabs.query(queryInfo);
    return promisifyChrome(api.tabs.query.bind(api.tabs), queryInfo);
  },
  async sendMessage(message) {
    if (hasPromiseApi()) return api.runtime.sendMessage(message);
    return promisifyChrome(api.runtime.sendMessage.bind(api.runtime), message);
  },
};

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function pretty(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

let toastTimer = null;
function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message ?? "";
  if (toastTimer) clearTimeout(toastTimer);
  if (message) {
    toastTimer = setTimeout(() => {
      el.textContent = "";
      toastTimer = null;
    }, 1500);
  }
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function ensureEmptyState(state) {
  if (!state || typeof state !== "object") return { events: {}, history: [] };
  if (!state.events || typeof state.events !== "object") state.events = {};
  for (const name of EVENT_NAMES) {
    if (!state.events[name]) state.events[name] = { count: 0, last: null };
  }
  if (!Array.isArray(state.history)) state.history = [];
  return state;
}

let lastRenderedState = null;
let lastRenderedHistory = [];

function render(state) {
  state = ensureEmptyState(state);
  lastRenderedState = state;

  const total = Object.values(state.events).reduce((n, e) => n + (e?.count ?? 0), 0);
  const statusEl = document.getElementById("status");
  statusEl.textContent =
    total > 0 ? `Seen ${total} Abrantes event${total === 1 ? "" : "s"} on this tab.` : "No Abrantes events seen on this tab yet.";

  const eventsEl = document.getElementById("events");
  eventsEl.textContent = "";

  for (const eventName of EVENT_NAMES) {
    const ev = state.events[eventName] ?? { count: 0, last: null };
    const wrapper = document.createElement("section");
    wrapper.className = "event";

    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = eventName;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `Count: ${ev.count} · Last: ${fmtTime(ev.last?.timestamp)}`;
    left.appendChild(name);
    left.appendChild(meta);

    const badge = document.createElement("div");
    badge.className = "badge";
    const check = document.createElement("div");
    check.className = `check${ev.count > 0 ? " on" : ""}`;
    check.textContent = "✓";
    const count = document.createElement("div");
    count.textContent = String(ev.count);
    badge.appendChild(check);
    badge.appendChild(count);

    row.appendChild(left);
    row.appendChild(badge);
    wrapper.appendChild(row);

    const details = document.createElement("div");
    details.className = "details";
    const detailHeader = document.createElement("div");
    detailHeader.className = "detailHeader";
    const detailLabel = document.createElement("div");
    detailLabel.textContent = "Last payload";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copyBtn";
    copyBtn.textContent = "Copy";
    copyBtn.dataset.copy = "event";
    copyBtn.dataset.event = eventName;
    copyBtn.disabled = !ev.last;
    detailHeader.appendChild(detailLabel);
    detailHeader.appendChild(copyBtn);
    const pre = document.createElement("pre");
    pre.textContent = ev.last ? pretty(ev.last) : "No data yet.";
    details.appendChild(detailHeader);
    details.appendChild(pre);
    wrapper.appendChild(details);

    eventsEl.appendChild(wrapper);
  }

  const historyEl = document.getElementById("history");
  historyEl.textContent = "";
  const history = Array.isArray(state.history) ? state.history.slice().reverse() : [];
  lastRenderedHistory = history;
  for (let i = 0; i < history.slice(0, 20).length; i++) {
    const item = history[i];
    const box = document.createElement("div");
    box.className = "historyItem";

    const top = document.createElement("div");
    top.className = "top";
    const label = document.createElement("div");
    label.textContent = item.eventName ?? "abrantes:*";
    const when = document.createElement("div");
    when.className = "when";
    when.textContent = fmtTime(item.timestamp);
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copyBtn";
    copyBtn.textContent = "Copy";
    copyBtn.dataset.copy = "history";
    copyBtn.dataset.pos = String(i);
    top.appendChild(label);
    top.appendChild(when);
    top.appendChild(copyBtn);

    const pre = document.createElement("pre");
    pre.textContent = pretty(item.detail);

    box.appendChild(top);
    box.appendChild(pre);
    historyEl.appendChild(box);
  }
}

let currentTabId = null;

async function getActiveTab() {
  const tabs = await ext.tabsQuery({ active: true, currentWindow: true });
  return tabs?.[0] ?? null;
}

async function refresh() {
  const tab = await getActiveTab();
  const pageInfo = document.getElementById("pageInfo");
  if (!tab) {
    pageInfo.textContent = "No active tab";
    currentTabId = null;
    render(null);
    return;
  }
  currentTabId = tab.id ?? null;
  if (tab.url) {
    try {
      const u = new URL(tab.url);
      pageInfo.textContent = u.host || tab.url;
    } catch {
      pageInfo.textContent = tab.url;
    }
  } else {
    pageInfo.textContent = `Tab ${tab.id}`;
  }
  const resp = await ext.sendMessage({ type: "get_tab_state", tabId: tab.id }).catch(() => null);
  render(resp?.ok ? resp.state : null);
}

document.getElementById("clearBtn").addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab) return;
  await ext.sendMessage({ type: "clear_tab_state", tabId: tab.id }).catch(() => {});
  await refresh();
});

api.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "abrantes_event_update") return;
  if (currentTabId && message.tabId && message.tabId !== currentTabId) return;
  refresh().catch(() => {});
});

document.addEventListener("click", async (e) => {
  const btn = e.target?.closest?.("button[data-copy]");
  if (!btn) return;

  const type = btn.dataset.copy;
  if (type === "event") {
    const eventName = btn.dataset.event;
    const payload = lastRenderedState?.events?.[eventName]?.last ?? null;
    const ok = await copyText(pretty(payload));
    toast(ok ? `Copied ${eventName}` : "Copy failed");
    return;
  }

  if (type === "history") {
    const pos = Number(btn.dataset.pos);
    const payload = Number.isFinite(pos) ? lastRenderedHistory?.[pos] : null;
    const ok = await copyText(pretty(payload));
    toast(ok ? "Copied history item" : "Copy failed");
  }
});

refresh().catch(() => {});
