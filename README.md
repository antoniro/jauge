# Jauge price data

This branch is written by a scheduled job. It holds the gas prices published by the Régie de l'énergie du Québec, as collected by [Jauge](https://github.com/antoniro/jauge), and every price change seen since collection started.

- `stations.json`: the current prices of every station.
- `h/<year>-<month>/<station id>.csv`: one station's price changes for one month.
- `meta.json`: when the data was generated and since when it has been collected.

The formats are described in [`docs/data.md`](https://github.com/antoniro/jauge/blob/main/docs/data.md) on the main branch.

Prices are reported by the stations themselves to the Régie. Jauge records them as published and is not affiliated with the Régie.
