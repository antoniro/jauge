# Record every price change, in one small file per station per month, on a separate branch

The Régie publishes current prices only, so the price chart needs a history we collect ourselves. Prices can change several times in one day, and the chart is meant to show that. So the job records each change as one line (time, fuel, new price) instead of one value per day or a full copy of the price list at every run. A full copy every five minutes would store the same 7,000 numbers 288 times a day; changes alone are a few kilobytes.

The lines are kept in one file per station per month. The app only ever needs one station's recent history at a time, so it downloads one or two small files for a chart instead of a file covering every station. Monthly files stay small, which keeps each save cheap.

The data lives on its own `data` branch so that hundreds of automatic commits a day do not bury the code's history on `main`.

Nothing is deleted for now. How long to keep full detail will be decided once a few weeks of real data show how much there is.

## Considered options

- One value per station per day: rejected, it hides changes within a day.
- A full snapshot at every run: rejected, almost all of it is repetition.
- One history file for all stations per day: rejected, the app would download thousands of stations to draw one chart.
- A database: rejected with the server it would need (see 0001).

## Consequences

- A station's identifier is derived from its address and position, because the feed has none. A corrected address starts a new history.
- A change is dated when the job noticed it, to within one run.
- The `data` branch grows by many small commits. If that becomes a problem its history can be squashed without losing data, since the files hold everything.
