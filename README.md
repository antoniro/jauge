# Jauge

Where to fill up in Quebec, ranked by what you really save.

Most gas-price apps sort stations by price. Jauge sorts them by **real savings**: what you save on your fill-up compared with the station you would have gone to anyway, minus what the extra driving costs. A station that is 3 cents cheaper but 12 km away can cost you money, and Jauge says so.

Prices come from the [Régie de l'énergie](https://regieessencequebec.ca), to which every Quebec station must report its own prices. Jauge shows them as published.

<p>
  <img src="docs/design/img/main.webp" width="260" alt="Main screen: the map with price signs and the best station's card">
  <img src="docs/design/img/unfolded.webp" width="260" alt="A station's card unfolded: where the savings come from, other fuels, price chart">
  <img src="docs/design/img/main-dark.webp" width="260" alt="Main screen in dark mode">
</p>

## Status

**Design is done, prices are being collected, and the app is being built.** It is not published as a website yet. This repository holds:

- the design documentation;
- the job that fetches the Régie's prices every few minutes and records each change (its output is on the [`data` branch](../../tree/data));
- the app, in progress: the main screen already runs on the live prices and the recorded history, borrowing its pieces from the mockups while each screen is rebuilt;
- the mockups the design came from.

## Documentation

| File | What it covers |
|---|---|
| [`PRODUCT.md`](PRODUCT.md) | What Jauge is, who it is for, what is decided and what is open |
| [`DESIGN.md`](DESIGN.md) | How it looks: colours, type, shapes, components, rules |
| [`docs/design/behaviour.md`](docs/design/behaviour.md) | How it behaves: savings, reference station, map, cards, settings |
| [`docs/data.md`](docs/data.md) | Where the prices come from, what the collecting job saves, and the file formats |
| [`GLOSSARY.md`](GLOSSARY.md) | The words used in the code, the interface and the docs |
| [`docs/adr/`](docs/adr) | Decisions that are hard to undo, and why they were made |

## Run it

You need Node 22 or newer.

```sh
npm install
npm run dev
```

- `http://localhost:5173/` is the app.
- `http://localhost:5173/fable.html` is the mockups. The bar at the bottom switches between variants, light and dark, phone and wide screen. Variant **B3** is the chosen design; the others are earlier directions kept for reference. The mockup code in `src/prototype/` is throwaway.

```sh
npm test        # the ranking rules, the history reader and the price collector
npm run build   # type-check and build
```

## Built with

React, TypeScript, Vite, [Motion](https://motion.dev) and [MapLibre](https://maplibre.org), with map tiles from [OpenFreeMap](https://openfreemap.org) (© OpenStreetMap contributors). Typefaces: Big Shoulders and Instrument Sans.

## Data and credit

Station names, addresses and prices are published by the Régie de l'énergie du Québec. Jauge is not affiliated with the Régie. If a price is wrong, it has to be corrected at the source: report it to the Régie.

## Licence

[MIT](LICENSE). Brand logos, when they are added, are the property of their owners and are not covered by this licence.
