(() => {
  "use strict";

  const TOAST_SELECTOR = 'li[data-sonner-toast]';
  const handledToasts = new WeakSet();

  let audioContext = null;

  function ensureAudioContext() {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playDoneSound() {
    const context = ensureAudioContext();
    if (context.state !== "running") return;

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
  }

  function handleToast(toast) {
    if (!toast.matches(TOAST_SELECTOR)) return;
    if (handledToasts.has(toast)) return;
    if (toast.getAttribute("data-mounted") !== "true") return;
    if (toast.getAttribute("data-visible") !== "true") return;

    handledToasts.add(toast);
    playDoneSound();
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

  new MutationObserver((records) => {
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
