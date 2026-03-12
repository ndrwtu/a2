# Personal Dashboard Live

A deployable Next.js starter for a personal dashboard with:
- live sports scoreboards for favorite teams
- live global news
- live San Mateo local news
- live stock quotes with add/remove tickers
- persistent notes
- persistent to-do list

## Data sources
- **Stocks:** Finnhub server-side quote and profile endpoints
- **News:** Google News RSS search feeds normalized in Next.js route handlers
- **Sports:** ESPN public scoreboard feeds for NBA, NFL, and MLB

## Setup
1. Copy `.env.example` to `.env.local`
2. Add your Finnhub API key
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000

## Notes
- The stock API key stays on the server in route handlers.
- News and sports endpoints are fetched server-side with `cache: 'no-store'` for fresh responses.
- ESPN scoreboard feeds are public but undocumented, so they may change in the future.

## Favorite teams
The starter is prewired for:
- Golden State Warriors
- San Francisco 49ers
- San Francisco Giants

You can change those in `app/page.tsx` and `app/api/dashboard/sports/route.ts`.
