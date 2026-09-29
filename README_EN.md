# ChatGPT Response Sound

[中文](README.md) | **English**

A tiny Firefox extension that plays one short sound when a ChatGPT response finishes.

## Why

When several ChatGPT tabs are working at the same time, visual completion notices are easy to miss. This extension has one job: **when a response is actually finished, make a sound**.

## Design

- Firefox only for now.
- Runs only on `https://chatgpt.com/*`.
- No account, backend, analytics, tracking, or network requests.
- No popup, options page, history, or notification center.
- No cross-tab deduplication. If two tabs finish, you hear two sounds.
- Conservative completion detection: a generation must first be observed as active, then ChatGPT's stop control must disappear, and the latest assistant turn must expose its completed-turn actions before the sound is played.
- If ChatGPT changes its UI and the completion signal cannot be confirmed, the extension should fail silent rather than guess.

## Install for testing

1. Clone or download this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…**.
4. Select `manifest.json` from this repository.
5. Reload existing `chatgpt.com` tabs.

Firefox removes temporary add-ons after the browser restarts. Packaging/signing can be added later if the implementation proves reliable.

## Usage

Use ChatGPT normally. After you submit a prompt, the extension observes that tab's generation cycle. When that response is confirmed complete, it plays one short beep.

Each tab is independent. Two completed tabs produce two beeps.

## Debugging

Open Firefox DevTools for a ChatGPT tab and filter the console for:

```text
[ChatGPT Response Sound]
```

The extension logs when generation is detected and when a completion sound is played. It does not log message contents.

## Known limitation

This project depends on implementation details of the ChatGPT web UI. OpenAI may change those details at any time, in which case the selectors may need a compatibility update.

## Privacy

All logic runs locally in the browser. The extension does not send or store conversation content.

## License

MIT
