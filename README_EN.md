# ChatGPT Response Sound

[中文](README.md) | **English**

> [!IMPORTANT]
> ## Project status: maintenance paused
>
> This project started as an attempt to provide reliable response-completion sounds for a multi-tab ChatGPT workflow.
>
> During development and real-world testing, I found that ChatGPT Web has more complicated cross-tab completion-notification behavior than expected:
>
> - the same completion event may appear as a notification in multiple other ChatGPT tabs;
> - cross-tab arbitration is required to avoid duplicate sounds;
> - even after deduplication, playback cannot always be reliably routed to the tab whose response actually completed;
> - the performance impact of continuously observing the ChatGPT DOM across many tabs has not been fully evaluated.
>
> For these reasons, I am no longer actively developing this extension as my daily-use solution.
>
> ### Recommended alternative
>
> I currently use [Reply Chime](https://addons.mozilla.org/firefox/addon/reply-chime/).
>
> After its developer responded to feedback and released an updated version, I tested it again with my real multi-tab ChatGPT workflow, and it now meets my needs.
>
> This repository remains available mainly as an experimental record of ChatGPT Web completion notifications, cross-tab behavior, and Firefox extension development.

A tiny Firefox extension that plays one short sound when ChatGPT Web shows a background response completion notice.

## Why

When several ChatGPT tabs are working at the same time, background completion notices are easy to miss. This extension has one job: **when ChatGPT shows a new background completion notice, make a sound**.

## Design

- Firefox only for now.
- Runs only on `https://chatgpt.com/*`.
- No account, backend, analytics, tracking, or network requests.
- No popup, options page, history, or notification center.
- It listens directly for the background response completion notices produced by ChatGPT Web.
- The same completion event plays only once across the entire Firefox instance, even if ChatGPT mirrors the notice into several tabs.
- Playback first uses a target conversation URL when available; otherwise it matches the notice text against ChatGPT tab titles, and only then falls back to the first reporting tab.
- It does not infer when ordinary foreground responses finish. A visible foreground response that produces no completion notice produces no sound.
- If ChatGPT changes its UI and a completion notice cannot be recognized, the extension fails silent rather than guessing response state.

## Install for testing

1. Clone or download this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on…**.
4. Select `manifest.json` from this repository.
5. Reload existing `chatgpt.com` tabs.

Firefox removes temporary add-ons after the browser restarts. This repository is currently in maintenance-paused status, with no plans for packaging or signing at this time.

## Usage

Use ChatGPT normally. When ChatGPT Web produces a background response completion notice, the extension plays only one short beep for that completion event across the entire Firefox instance.

If the notice contains a recognizable conversation link, playback is routed to the completed conversation tab when possible. If no link is available, the extension tries to match the notice text against ChatGPT tab titles, so Firefox's audio indicator can still point to the relevant tab. Only if neither method resolves the target does the first reporting tab play the sound. Separate completion events still produce separate alerts. An ordinary visible foreground response produces no sound unless ChatGPT also shows this kind of notice.

## Known limitation

This project depends on ChatGPT Web's current notification implementation. OpenAI may change it at any time, in which case the extension may need an update.

## Privacy

All logic runs locally in the browser. The extension does not collect, send, or store conversation content, and it makes no network requests.

## License

MIT
