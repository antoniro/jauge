# React with Motion, built with Vite

The app's identity is fluid, physical animation (drag-to-dismiss cards, a station card that grows into its detail page, lists that reorder smoothly), and Motion's React version is the most complete tool for exactly that, with the largest community behind both. We accept React's larger download (roughly 150 KB compressed with Motion, against the map library's ~270 KB) because the app is cached on the phone after the first visit. Vite rather than Next.js because GitHub Pages only serves files: Next.js's server features could not run there.

## Considered options

- Svelte: smallest pages and high developer satisfaction, but a smaller ecosystem and Motion's best features are not available for it.
- Vue with Motion for Vue, Solid, Angular, Astro: no clear advantage for a single interactive screen.
- GSAP: free since 2025 but not under an open-source licence; only to be added if Motion falls short.
