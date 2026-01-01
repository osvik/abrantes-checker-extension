# Abrantes checker

Firefox/Chrome extension that listens for Abrantes A/B testing DOM events on the current page and shows when each one fires (with the event payload).

## Builds (Firefox + Chrome)

Run `./scripts/build.sh` to generate:

- `build/firefox` (Manifest V2, for Firefox temporary add-on)
- `build/chrome` (Manifest V3, for Chrome)

## Packages (ZIPs)

Run `./scripts/package.sh` to generate:

- `dist/abrantes-checker-firefox.zip`
- `dist/abrantes-checker-chrome.zip`

Please note that loading packages may not work. It's recommended to install from the build folder as described for Firefox and Chrome (and other browsers using one of this two formats)

## Monitored events

From `web-page-events.js`:

- `abrantes:assignVariant`
- `abrantes:renderVariant`
- `abrantes:persist`
- `abrantes:track`
- `abrantes:formTrack`

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `build/firefox/manifest.json`

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `build/chrome`

## Quick test

Open any page, then in DevTools Console paste the contents of `web-page-events.js`. Open the extension popup to see the events update.
