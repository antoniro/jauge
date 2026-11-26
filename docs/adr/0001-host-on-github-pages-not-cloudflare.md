# Host on GitHub Pages, collect prices with a GitHub scheduled job

The owner already has a free Cloudflare account, but it runs another product and the free plan's limits (daily requests, database reads and writes, scheduled jobs) are shared across the whole account, so a busy gas app could break that product until the daily reset. Cloudflare Workers' free plan also allows only 10 ms of processing per run, and simply unpacking and reading the Régie feed took about 10.8 ms on a desktop machine. We therefore host the site on GitHub Pages and run the price collection as a GitHub Actions scheduled job in this public repository, saving changed prices as files in the repo. GitHub's schedules can run late or skip, so price history may have small gaps; the app falls back to the Régie's feed directly when our data is more than an hour old.

## Considered options

- Cloudflare Workers + D1 on the existing account: rejected for the shared limits and the 10 ms limit above.
- Cloudflare's $5/month plan: removes the processing limit but the project is meant to be free.
