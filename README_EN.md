# ChatGPT Response Sound

[中文](README.md) | **English**

A tiny Firefox extension that plays one short sound when ChatGPT Web shows a background response completion notice.

## Why

When several ChatGPT tabs are working at the same time, background completion notices are easy to miss. This extension has one job: **when ChatGPT shows a new background completion notice, make a sound**.

## Design

- Firefox only for now.
- Runs only on `https://chatgpt.com/*`.
- No account, backend, analytics, tracking, or network requests.
- No popup, options page, history, or notification center.
- It listens directly for the background response completion notices produced by ChatGPT Web. Each newly visible notice triggers the sound once.
- Each tab works independently, with no cross-tab deduplication. If two tabs show completion notices, you hear two sounds.
- It does not infer when ordinary foreground responses finish. A visible foreground response that produces no completion notice produces no sound.
- If ChatGPT changes its UI and a completion notice cannot be recognized, the extension fails silent rather than guessing response state.

## Install for testing

1. Clone or download this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…**.
4. Select `manifest.json` from this repository.
5. Reload existing `chatgpt.com` tabs.

Firefox removes temporary add-ons after the browser restarts. Packaging/signing can be added later if the implementation proves reliable.

## Usage

Use ChatGPT normally. When ChatGPT Web shows a background response completion notice in that tab, the extension plays one short beep.

Each tab is independent. Completion notices in two tabs produce two beeps. An ordinary visible foreground response produces no sound unless ChatGPT also shows this kind of notice.

## Known limitation

This project depends on ChatGPT Web's current notification implementation. OpenAI may change it at any time, in which case the extension may need an update.

## Privacy

All logic runs locally in the browser. The extension does not collect, send, or store conversation content, and it makes no network requests.

## License

MIT
