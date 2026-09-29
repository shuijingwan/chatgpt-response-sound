(() => {
  "use strict";

  const STOP_SELECTOR = [
    '[data-testid="stop-button"]',
    'form[data-chatgpt-composer] button[aria-label="Stop"]',
    'button[aria-label="Stop streaming"]',
  ].join(", ");

  const USER_TURN_SELECTOR = [
    '[data-testid^="conversation-turn-"][data-turn="user"]',
    '[data-testid^="conversation-turn-"][data-message-author-role="user"]',
    '[data-testid^="conversation-turn-"]:has([data-message-author-role="user"])',
    '[data-turn-key]:has([data-user-message-bubble])',
  ].join(", ");

  const ASSISTANT_TURN_SELECTOR = [
    '[data-testid^="conversation-turn-"][data-turn="assistant"]',
    '[data-testid^="conversation-turn-"][data-message-author-role="assistant"]',
    '[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"])',
    '[data-turn-key]:has([data-conversation-role="assistant"])',
  ].join(", ");

  const COMPLETION_ACTION_SELECTOR = [
    'button[data-testid="copy-turn-action-button"]',
    '.turn-action-controls button',
  ].join(", ");

  const VERIFY_DELAY_MS = 900;
  const LOG_PREFIX = "[ChatGPT Response Sound]";

  let audioContext = null;
  let generationActive = false;
  let verifyTimer = null;

  function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playDoneSound() {
    const context = ensureAudioContext();
    if (context.state !== "running") {
      console.warn(`${LOG_PREFIX} AudioContext is not running; no sound played.`);
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.21);

    console.debug(`${LOG_PREFIX} response complete; sound played.`);
  }

  function isGenerating() {
    return Boolean(document.querySelector(STOP_SELECTOR));
  }

  function lastElement(selector) {
    const elements = document.querySelectorAll(selector);
    return elements.length ? elements[elements.length - 1] : null;
  }

  function latestAssistantIsComplete() {
    const user = lastElement(USER_TURN_SELECTOR);
    const assistant = lastElement(ASSISTANT_TURN_SELECTOR);
    if (!user || !assistant) return false;

    const followsUser = Boolean(
      user.compareDocumentPosition(assistant) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    if (!followsUser) return false;

    return Boolean(assistant.querySelector(COMPLETION_ACTION_SELECTOR));
  }

  function cancelVerification() {
    if (verifyTimer !== null) {
      clearTimeout(verifyTimer);
      verifyTimer = null;
    }
  }

  function scheduleVerification() {
    if (verifyTimer !== null) return;

    verifyTimer = setTimeout(() => {
      verifyTimer = null;

      if (!generationActive || isGenerating()) return;
      if (!latestAssistantIsComplete()) return;

      generationActive = false;
      playDoneSound();
    }, VERIFY_DELAY_MS);
  }

  function checkState() {
    if (isGenerating()) {
      cancelVerification();
      if (!generationActive) {
        generationActive = true;
        console.debug(`${LOG_PREFIX} generation detected.`);
      }
      return;
    }

    if (generationActive) scheduleVerification();
  }

  function primeAudio() {
    ensureAudioContext();
    document.removeEventListener("pointerdown", primeAudio, true);
    document.removeEventListener("keydown", primeAudio, true);
  }

  document.addEventListener("pointerdown", primeAudio, true);
  document.addEventListener("keydown", primeAudio, true);

  new MutationObserver(checkState).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-testid", "data-turn", "data-message-author-role"],
  });

  checkState();
})();
