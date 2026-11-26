# The price data

Jauge has no server. A scheduled GitHub job fetches the Régie de l'énergie's public feed and saves what the app needs as plain files on the `data` branch of this repository.

- The job: [`.github/workflows/collect-prices.yml`](../.github/workflows/collect-prices.yml)
- The code: [`scripts/collect/`](../scripts/collect) (`lib.mjs` is the logic, `run.mjs` reads and writes, `lib.test.mjs` are the tests)
- Why it is built this way: [`adr/0001`](adr/0001-host-on-github-pages-not-cloudflare.md), [`adr/0005`](adr/0005-record-every-price-change-per-station.md)

## What each run does

1. Downloads `https://regieessencequebec.ca/stations.geojson.gz`.
2. Turns it into a compact list of stations.
3. Compares each station's prices with the previous run.
4. Appends one line to the station's history for every price that changed.
5. Commits to the `data` branch, unless no price moved (a quiet feed is still saved every half hour so the app can tell how fresh the data is).

The run stops without saving anything if the feed cannot be read, or if it suddenly holds fewer than half the stations of the previous run.

## Files on the `data` branch

### `stations.json`

The current prices. This is the file the app loads.

```json
{
  "generatedAt": "2026-11-26T20:25:00Z",
  "stations": [
    {
      "id": "0cxWKFxbDq",
      "n": "2642-4101 Québec Inc.",
      "b": "Shell",
      "a": "230 av. Murdoch, Rouyn-Noranda",
      "r": "Abitibi-Témiscamingue",
      "lat": 48.24676,
      "lon": -79.01957,
      "p": { "R": 166.4, "S": 204.4, "D": 279.9 },
      "t": { "R": 1795724700, "S": 1795724700, "D": 1795724700 }
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `generatedAt` | When the Régie generated the feed this file was made from (UTC) |
| `id` | Our identifier for the station (see below) |
| `n`, `b`, `a`, `r` | Name, banner (`null` when the station has none), address, administrative region, as the Régie writes them |
| `lat`, `lon` | Position, five decimals |
| `p` | Posted price in cents per litre, per fuel: `R` Régulier, `S` Super, `D` Diesel. A fuel the station does not sell is absent |
| `t` | Per fuel, when we saw its price change last (seconds since 1970, UTC) |

### `h/<year>-<month>/<station id>.csv`

A station's price changes for one month, oldest first, one line per change, no header:

```
2026-11-26T20:25:00Z,R,149.9
2026-11-27T11:05:00Z,R,152.9
2026-11-27T21:40:00Z,D,
```

Time (UTC), fuel, new price. An empty price means the station stopped selling that fuel. Between two lines for the same fuel, the price did not change.

- A station's first line for a fuel is the price we saw when we first met it, not a change.
- To draw 30 days, the app reads this month's file and last month's.

### `meta.json`

When the data was generated, since when we have been collecting (`since`), how many stations and changes the last run saw, and the stations set aside with the reason.

## Things to know

- **Station identifiers are ours.** The feed has none, so `id` is derived from the address and position. If the Régie corrects either, the station gets a new `id` and its history starts again.
- **Times are when we noticed, not when the station changed its sign.** They are accurate to the interval between two runs, normally five minutes, sometimes more.
- **Two changes between two runs look like one.**
- **History starts on the day the job first ran.** The Régie publishes no past prices.
- **Stations without a usable position are set aside**, not guessed. The feed contains at least one placed at latitude 0, longitude 0.
- **GitHub turns scheduled jobs off** in repositories with no activity for 60 days. If the data stops, check the Actions tab.

## Run it yourself

```sh
node scripts/collect/run.mjs /tmp/jauge-data   # writes the files above into that folder
npm test                                        # the collector's tests
```
