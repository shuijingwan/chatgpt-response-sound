(() => {
  "use strict";

  const TOAST_SELECTOR = 'li[data-sonner-toast]';
  const handledToasts = new WeakSet();

  let audioContext = null;
  let lastReportedState = "";

  function ensureAudioContext() {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  async function playDoneSound() {
    const context = ensureAudioContext();
    if (context.state === "suspended") {
      await context.resume().catch(() => {});
    }
    if (context.state !== "running") return false;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.23);
    return true;
  }

  function conversationKey(rawUrl) {
    if (!rawUrl) return null;
    try {
      const url = new URL(rawUrl, location.href);
      const match = url.pathname.match(/\/c\/([^/?#]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
  function targetUrlFromToast(toast) {
    for (const anchor of toast.querySelectorAll("a[href]")) {
      try {
        const url = new URL(anchor.getAttribute("href"), location.href);
        if (url.origin === location.origin && conversationKey(url.href)) {
          return url.href;
        }
      } catch {
        // Ignore malformed links inside unrelated toast content.
      }
    }
    return null;
  }

  function normalizedToastText(toast) {
    return (toast.innerText || toast.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function reportTabState() {
    const stateKey = `${location.href}\n${document.title}`;
    if (stateKey === lastReportedState) return;
    lastReportedState = stateKey;
    browser.runtime.sendMessage({
      type: "tab-state",
      url: location.href,
      title: document.title,
    }).catch(() => {});
  }
  function reportCompletion(toast) {
    const targetUrl = targetUrlFromToast(toast);
    const targetConversation = conversationKey(targetUrl);
    const text = normalizedToastText(toast);
    const eventKey = targetConversation
      ? `conversation:${targetConversation}`
      : `toast:${hashText(text)}`;

    browser.runtime.sendMessage({
      type: "completion-toast",
      eventKey,
      targetUrl,
      toastText: text,
      pageUrl: location.href,
      pageTitle: document.title,
    }).catch(() => {});
  }

  function handleToast(toast) {
    if (!toast.matches(TOAST_SELECTOR)) return;
    if (handledToasts.has(toast)) return;
    if (toast.getAttribute("data-mounted") !== "true") return;
    if (toast.getAttribute("data-visible") !== "true") return;

    handledToasts.add(toast);
    reportCompletion(toast);
  }
  function inspectAddedNode(node) {
    if (!(node instanceof Element)) return;

    if (node.matches(TOAST_SELECTOR)) handleToast(node);
    for (const toast of node.querySelectorAll(TOAST_SELECTOR)) {
      handleToast(toast);
    }
  }

  for (const toast of document.querySelectorAll(TOAST_SELECTOR)) {
    handledToasts.add(toast);
  }

  function primeAudio() {
    ensureAudioContext();
  }

  document.addEventListener("pointerdown", primeAudio, true);
  document.addEventListener("keydown", primeAudio, true);
  window.addEventListener("pageshow", reportTabState);
  window.addEventListener("popstate", reportTabState);
  window.addEventListener("hashchange", reportTabState);
  reportTabState();
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== "play-completion-sound") return undefined;
    return playDoneSound().then((played) => ({ played }));
  });

  new MutationObserver((records) => {
    reportTabState();

    for (const record of records) {
      if (record.type === "attributes") {
        handleToast(record.target);
        continue;
      }

      for (const node of record.addedNodes) {
        inspectAddedNode(node);
      }
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-mounted", "data-visible"],
  });
})();
