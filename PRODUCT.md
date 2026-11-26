# Product

<!-- impeccable:product-schema 1 -->

Everything here was decided by the project owner during the design sessions of November 2026. Open questions are listed as open; nothing is filled in by guesswork.

## Platform

web

## Users

People in Quebec who are about to buy gas and want to know where to go. Typical moment: in or near the car, phone in hand, a few seconds to decide. A second moment is at a laptop, planning a trip or a regular route.

They are not gas-price hobbyists. They want one answer ("go there") and enough proof to trust it.

## Product Purpose

Jauge shows where to fill up near you in Quebec, using the prices every station must report to the Régie de l'énergie.

It is an open-source hobby project. It does not aim for a large audience or for income. Success means: the answer is right, the app is a pleasure to use, and it is fast.

## Positioning

Most gas-price apps rank stations by posted price. Jauge ranks them by **real savings**: what you save on your fill-up compared with the station you would have gone to anyway, minus what the extra driving costs. A station that is 3 cents cheaper but 12 km away can lose money, and Jauge says so.

The second commitment is craft: the interface, its motion and its speed are the point of the project, not a layer on top.

## Operating Context

- Data comes from the Régie de l'énergie's public feed (`regieessencequebec.ca/stations.geojson.gz`). Stations report their own prices; Jauge shows them as published.
- The site is static and hosted on GitHub Pages. A scheduled GitHub job fetches the feed, shrinks it into a small file for the app, and records price changes as history. There is no server of our own. See `docs/adr/0001`.
- Used mostly on phones, outdoors or in a car, in daylight and at night. Also used on laptops.
- French first. English follows the device language.

## Capabilities and Constraints

Decided for the first version:

- Rank stations around the person by real savings, for one fuel type at a time (Régulier, Super, Diesel).
- A map with every station's price, and a swipeable row of cards for the best options.
- A reference station: the closest one by default, or one the person picks. See `docs/design/behaviour.md`.
- Looking at another place without pretending the person is there.
- Each station's details: where the savings come from, its other fuels, its price history, directions, and a way to report a wrong price to the Régie.
- Settings: fuel, fill volume, vehicle consumption, search radius, directions app, language, theme.
- Works on phones and on wide screens.

Constraints:

- Usable within 1 second on a three-year-old mid-range Android phone; 60 frames per second; every animation can be skipped; reduced-motion users get simple fades.
- Distances are straight-line distance multiplied by 1.3 and always shown with "≈". Real driving distance is not decided yet.
- The Régie publishes no price history. Jauge collects its own, starting the day its job first runs, and says "since <date>" where history is short.
- Visits are counted only with a cookieless counter, mentioned in the privacy note.

Open:

- How long to keep detailed price history, and in what file layout.
- Which service provides place search and official boundaries for area prices.
- Whether distances should come from a routing service.

Terms used in the code, the interface and these documents are defined in `GLOSSARY.md`.

## Brand Commitments

- Name: **Jauge**. Icon: an upright car fuel gauge, F on top, E at the bottom, with an orange needle (`public/icon.svg`).
- One accent colour, "Cône" orange, used only for the best option and the main action.
- Prices are written the way station signs write them: `171,9 ¢/L` in French, `171.9 ¢/L` in English.
- Brand logos: the real, unaltered logos of the ten largest banners inside our own round badge; other stations get a neutral pump badge. Logo files are not covered by the MIT licence and are removed on request. Until they are added, the code uses coloured placeholder badges.
- A mascot, Gazou (a clay-style fuel drop), may appear on loading, empty and error screens only. It is not drawn yet.
- The source of the prices is always visible on the main screen.
- No instruction text. Controls explain themselves through icons and familiar patterns.

## Evidence on Hand

- A snapshot of the Régie feed used by the mockups: `public/data/stations.json` (about 2,470 stations).
- Working mockups of every screen: `src/prototype/main-screen-fable/` (variant B3). Screenshots: `docs/design/img/`.
- No testimonials, usage numbers or press exist. Do not invent any.
- The price history shown in the mockups is invented sample data.

## Product Principles

1. **Say where to go, then show why.** One clear answer first; the sum behind it one tap away.
2. **Never pretend.** No invented position, no smoothed prices, no hidden source. If the app does not know, it shows less.
3. **Obvious without words.** If a control needs a sentence to explain it, redesign the control.
4. **Fast is part of beautiful.** Motion answers the finger and never makes anyone wait.
5. **The data is the Régie's.** Jauge relays it, credits it, and sends corrections back to it.

## Accessibility & Inclusion

- Text contrast of at least 4.5:1 (3:1 for large text), in both themes.
- Touch targets of at least 44 px.
- Everything reachable by keyboard, with a visible focus ring.
- `prefers-reduced-motion` is respected everywhere.
- Colour never carries meaning alone: the best option also has a label, the reference also has a tag.
