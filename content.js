(() => {
  "use strict";

  const TURN_SELECTOR = '[data-testid^="conversation-turn-"]';
  const ROLE_SELECTOR = '[data-message-author-role]';
  const COPY_ACTION_SELECTOR = 'button[data-testid="copy-turn-action-button"]';
  const STOP_SELECTOR = [
    '[data-testid="stop-button"]',
    'button[aria-label="Stop"]',
    'button[aria-label="Stop streaming"]',
  ].join(", ");

  const VERIFY_DELAY_MS = 700;
  const LOG_PREFIX = "[ChatGPT Response Sound]";

  let audioContext = null;
  let pendingResponse = false;
  let verifyTimer = null;
  let knownUserTurns = countTurns("user");

  function ensureAudioContext() {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playDoneSound() {
    const context = ensureAudioContext();
    if (context.state !== "running") {
      console.warn(`${LOG_PREFIX} completion confirmed, but audio is not unlocked.`);
      return;
    }

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

    console.debug(`${LOG_PREFIX} response complete; sound played.`);
  }

  function getTurns() {
    return [...document.querySelectorAll(TURN_SELECTOR)];
  }

  function roleOf(turn) {
    const roleNode = turn.querySelector(ROLE_SELECTOR);
    return roleNode?.getAttribute("data-message-author-role") || null;
  }

  function countTurns(role) {
    return getTurns().filter((turn) => roleOf(turn) === role).length;
  }

  function latestTurn(role) {
    const turns = getTurns();
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (roleOf(turns[i]) === role) return turns[i];
    }
    return null;
  }

  function isGenerating() {
    return Boolean(document.querySelector(STOP_SELECTOR));
  }

  function latestAssistantIsComplete() {
    const user = latestTurn("user");
    const assistant = latestTurn("assistant");
    if (!user || !assistant) return false;

    const followsUser = Boolean(
      user.compareDocumentPosition(assistant) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    if (!followsUser) return false;

    return Boolean(assistant.querySelector(COPY_ACTION_SELECTOR));
  }

  function cancelVerification() {
    if (verifyTimer !== null) {
      clearTimeout(verifyTimer);
      verifyTimer = null;
    }
  }

  function arm(reason) {
    if (pendingResponse) return;
    pendingResponse = true;
    console.debug(`${LOG_PREFIX} response pending (${reason}).`);
  }

  function scheduleVerification() {
    if (!pendingResponse || verifyTimer !== null) return;

    verifyTimer = setTimeout(() => {
      verifyTimer = null;
      if (!pendingResponse) return;
      if (isGenerating()) return;
      if (!latestAssistantIsComplete()) return;

      pendingResponse = false;
      playDoneSound();
    }, VERIFY_DELAY_MS);
  }

  function checkState() {
    const userTurns = countTurns("user");
    if (userTurns > knownUserTurns) {
      knownUserTurns = userTurns;
      arm("new user turn");
    }

    if (isGenerating()) {
      cancelVerification();
      arm("generation control");
      return;
    }

    scheduleVerification();
  }

  function primeAudio() {
    ensureAudioContext();
  }

  document.addEventListener("pointerdown", primeAudio, true);
  document.addEventListener("keydown", primeAudio, true);

  new MutationObserver(checkState).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-testid", "data-message-author-role"],
  });

  checkState();
})();
