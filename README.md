# jurisgames

Public site and release channel for Juris Games apps, served at https://jurisgames.com (GitHub Pages).

- `/join#…` and `/link#…`: invite and device-link pages for Tasks. The code is in the URL fragment, which browsers never send to a server.
- `update.json`: the static update manifest the apps read (also at `raw.githubusercontent.com/kleiders3010/jurisgames/main/update.json` as a fallback).
- `.well-known/assetlinks.json`: lets Android open `/join` and `/link` links straight in the app.
- Releases: APKs and desktop installers.
