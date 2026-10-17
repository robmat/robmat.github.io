# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Website of **Emberfox Games** (Android/iOS game studio, Google Play developer id `8228670503574649511`). Built with **Astro 7 + Tailwind CSS 4** as a fully static site. Canonical domain is `emberfox.online` (Apache, files uploaded over FTP); the same build is also published to GitHub Pages at `robmat.github.io`. Besides the Astro pages it hosts a few static files whose URLs must not change (see `public/`).

The game source code lives in `D:\gry` (one repo per game; `sgtpuzzles` and `beautiful_asian_wallpapers` hold several apps on separate branches — see `D:\gry\Invoke-AllRepos.ps1`).

## Commands

```bash
npm install
npm run dev       # dev server on http://localhost:4321 with hot reload
npm run build     # static output in dist/
npm run preview   # serve dist/ locally
```

There are no tests or linters. `npm run build` is the check: it fails on a missing game image or a broken `.astro` file.

## Deploying

- **GitHub Pages:** `.github/workflows/deploy.yml` builds and deploys on every push to `master` (Pages source must be set to "GitHub Actions" in the repo settings).
- **emberfox.online:** upload the contents of `dist/` over FTP. Credentials are in the git-ignored `secrets.ps1` (`$env:EMBERFOX_FTP_HOST`, `_USER`, `_PASS`) — never print or commit them.

## Layout

- `src/data/games.json` — **the game catalog and single source of truth for the home page.** One entry per live store listing: package `id`, store `name`, Play `category`, `group` (one of the filter groups at the top of the file), Play short description `desc`, `rating`/`votes` when Play shows them, optional `appStore` (Apple app id) and `featured`. Text comes from the live Google Play listings; keep it in sync with Play rather than rewriting it here.
- `src/assets/games/<media>/` — `launcher.png` (512×512) and `play_store_graphic.png|jpg` (1024×500) per game, copied from the game's repo root in `D:\gry`. `<media>` is the entry's `media` field. Astro converts them to responsive WebP at build time (`src/lib/games.ts` resolves them via `import.meta.glob`; a missing file fails the build).
- `src/layouts/Base.astro` — shared `<head>` (SEO/OG tags, Google Ads + Consent Mode), header, footer and the cookie banner.
- `src/pages/index.astro` — home page; `src/pages/support.astro` — Arrows Untangle (iOS) support/FAQ page. `build.format: 'file'` keeps the old URLs (`/support.html`).
- `public/` — copied to the site root as-is: `bn/` (separate app, below), `privacy_policy.html` (linked from the store listings — don't move or rename), `app-ads.txt` (AdMob), `.htaccess` (anti-hotlinking on emberfox.online), `favicon.ico`, `media/emberfox.png` (logo, also the OG image).

### Adding a game

1. Copy `launcher.png` and `play_store_graphic.png` from the game's repo to `src/assets/games/<folder>/`.
2. Add an entry to `src/data/games.json` with the listing's title, short description and category from Google Play.
3. `npm run build`.

## Analytics / consent

`Base.astro` loads Google Ads gtag (`AW-959467352`) with Consent Mode v2: everything defaults to `denied`; the banner's Accept/Reject is stored in `localStorage.consent` (the old page's `consentGranted=true` is still honored). Every link with `data-conversion` fires the `AW-959467352/Q5itCPisiaUYENiewckD` conversion on click — put it on any new outbound store or mailto link. Enhanced conversions are fed a randomly generated fake email; this is deliberate existing behavior, not a bug to silently "fix" — ask before changing tracking.

## `public/bn/` — Battle Nations fight simulator

A self-contained vanilla-JS app (served at `/bn/`), independent of the Astro site. It simulates fights between player units (Pelicans, Mega Tank) and boss NPCs (the composite Goliath Tank, whose sub-units are defined in `GOLIATH_VARIANTS` in `app.js`) from the game *Battle Nations*. Scripts are loaded as plain `<script>` tags in a fixed order, each exposing a global:

- `wiki.js` → `window.WikiFetcher`: at runtime, fetches unit pages from the Miraheze wiki MediaWiki API (`battlenations.miraheze.org`, `origin=*` for CORS) and parses the wikitext templates (`UnitProfile`, `UnitRanksBox`, `WeaponBoxTabber`, …) into stats. Unit stats come from the live wiki, not from files in the repo.
- `sim.js` → `window.SimEngine`: pure simulation engine with no DOM access (turns, cooldowns, damage/resistance, targeting).
- `patterns.js` → `window.ATTACK_PATTERNS`: attack tile patterns. This is an inlined copy of `assets/patterns.json` (whose `_notes` key documents the grid/targeting format), kept inline so the page works over `file://` where `fetch()` of local files is blocked. Keep the two in sync.
- `app.js`: UI — board/tray, drag-to-resize panels, controls, battle log, tooltips; wires the three modules together.

The `#version-tag` text at the bottom of `bn/index.html` (date + short commit hash) is edited by hand.

## Repo hygiene

Not part of the build: large source art at the repo root (`00005-*.png`, `00037-*.png` ~20 MB, `background.pdn`, `under_construction.png`) and a few loose images left in `media/`.
