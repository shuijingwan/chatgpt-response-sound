"use strict";

const RECENT_CONVERSATION_MS = 5000;
const RECENT_FALLBACK_MS = 1500;

const recentEvents = new Map();
const tabStates = new Map();

function conversationKey(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/\/c\/([^/?#]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function cleanupRecent(now) {
  for (const [key, timestamp] of recentEvents) {
    if (now - timestamp > RECENT_CONVERSATION_MS) {
      recentEvents.delete(key);
    }
  }
}

function normalizeComparable(text) {
  return (text || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedTabTitle(title) {
  return normalizeComparable(title)
    .replace(/\s*[-–—|]\s*chatgpt$/u, "")
    .trim();
}

function choosePlaybackTab(targetUrl, toastText, reporterTabId) {
  const targetConversation = conversationKey(targetUrl);
  if (targetConversation) {
    let bestTabId = null;
    let bestSeen = -1;

    for (const [tabId, state] of tabStates) {
      if (conversationKey(state.url) !== targetConversation) continue;
      if (state.lastSeen > bestSeen) {
        bestTabId = tabId;
        bestSeen = state.lastSeen;
      }
    }

    if (bestTabId != null) return bestTabId;
  }

  const normalizedToast = normalizeComparable(toastText);
  let titleMatchTabId = null;
  let titleMatchLength = -1;
  let titleMatchSeen = -1;

  if (normalizedToast) {
    for (const [tabId, state] of tabStates) {
      const title = normalizedTabTitle(state.title);
      if (title.length < 4 || !normalizedToast.includes(title)) continue;
      if (title.length > titleMatchLength ||
          (title.length === titleMatchLength && state.lastSeen > titleMatchSeen)) {
        titleMatchTabId = tabId;
        titleMatchLength = title.length;
        titleMatchSeen = state.lastSeen;
      }
    }
  }

  return titleMatchTabId ?? reporterTabId;
}

async function playInTab(tabId, eventKey) {
  if (tabId == null) return false;
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: "play-completion-sound",
      eventKey,
    });
    return response?.played === true;
  } catch {
    return false;
  }
}
browser.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab?.id;
  if (tabId == null) return undefined;

  if (message?.type === "tab-state") {
    tabStates.set(tabId, {
      url: message.url,
      title: message.title,
      lastSeen: Date.now(),
    });
    return { registered: true };
  }

  if (message?.type !== "completion-toast") return undefined;

  const now = Date.now();
  tabStates.set(tabId, {
    url: message.pageUrl,
    title: message.pageTitle,
    lastSeen: now,
  });
  cleanupRecent(now);

  const eventKey = message.eventKey;
  const ttl = eventKey?.startsWith("conversation:")
    ? RECENT_CONVERSATION_MS
    : RECENT_FALLBACK_MS;
  const previous = recentEvents.get(eventKey);

  if (previous != null && now - previous < ttl) {
    return { deduped: true, played: false };
  }
  recentEvents.set(eventKey, now);

  const preferredTabId = choosePlaybackTab(
    message.targetUrl,
    message.toastText,
    tabId,
  );
  let playbackTabId = null;

  if (await playInTab(preferredTabId, eventKey)) {
    playbackTabId = preferredTabId;
  } else if (preferredTabId !== tabId && await playInTab(tabId, eventKey)) {
    playbackTabId = tabId;
  }

  return {
    deduped: false,
    played: playbackTabId != null,
    playbackTabId,
  };
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
});
