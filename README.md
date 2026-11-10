# SPECTRA

A brand-new, standalone digital space built separately from AVX.

## Live features

- Responsive, custom-designed start page
- Browser search and safe external website launching
- Read-only public-page text viewer for a small list of approved sources
- Saved bookmarks, reading history, quick notes and focus timer
- Three self-contained mini games: Neon Snake, Memory Grid and Grid Duel
- Appearance settings with light/dark mode, accent colors and reduced motion
- No third-party trackers, sign-in flow, or external JavaScript dependencies

## Hosting and architecture

The static interface is hosted on GitHub Pages. Its public article reader is a **separate** service: https://spectra-reader-lrdsot.v2.appdeploy.ai/

The reader is deliberately **not an unrestricted proxy**: it permits only specific public HTTPS information sources, strips HTML to safe text, and does not carry browser sessions, scripts, authentication, or cookies. It is not intended to bypass school filtering or other network restrictions.

GitHub Pages cannot itself run a server-side general web proxy. The site may work even where the reader service cannot be reached; it shows a visible error instead of hanging.

## Development

Open index.html locally in a modern browser or serve the folder with any static host. No build step required. Browser settings and bookmarks use localStorage (and will not follow you across devices).

All content and games are original and self-contained.
