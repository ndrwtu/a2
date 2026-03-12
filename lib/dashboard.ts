import { XMLParser } from 'fast-xml-parser';

export type NewsArticle = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  summary: string;
};

export type StockQuote = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketState: string;
  updatedAt: string;
};

export type SportsGame = {
  id: string;
  league: string;
  away: string;
  home: string;
  awayScore: number | null;
  homeScore: number | null;
  status: string;
  venue: string;
  startTime: string;
  favoriteTeam: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: true,
});

export async function getGoogleNewsArticles(query: string, category: string): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Google News RSS failed (${response.status})`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  return list.slice(0, 12).map((item: any, index: number) => ({
    id: item.guid || item.link || `${category}-${index}`,
    title: cleanText(item.title || 'Untitled'),
    source: cleanSource(item.source?.['#text'] || item.source || 'Google News'),
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    url: item.link || '#',
    category,
    summary: cleanText(item.description || ''),
  }));
}

export async function getFinnhubQuotes(symbols: string[]): Promise<StockQuote[]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    throw new Error('Missing FINNHUB_API_KEY environment variable.');
  }

  const unique = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)));

  const quotes = await Promise.all(
    unique.map(async (symbol) => {
      const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
      const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;

      const [quoteRes, profileRes] = await Promise.all([
        fetch(quoteUrl, { cache: 'no-store' }),
        fetch(profileUrl, { cache: 'no-store' }),
      ]);

      if (!quoteRes.ok) {
        return {
          symbol,
          name: symbol,
          price: null,
          change: null,
          changePercent: null,
          marketState: 'Unavailable',
          updatedAt: new Date().toISOString(),
        } satisfies StockQuote;
      }

      const quote = await quoteRes.json();
      const profile = profileRes.ok ? await profileRes.json() : {};
      return {
        symbol,
        name: profile?.name || symbol,
        price: typeof quote?.c === 'number' ? quote.c : null,
        change: typeof quote?.d === 'number' ? quote.d : null,
        changePercent: typeof quote?.dp === 'number' ? quote.dp : null,
        marketState: quote?.t ? 'Live quote' : 'Recent quote',
        updatedAt: quote?.t ? new Date(quote.t * 1000).toISOString() : new Date().toISOString(),
      } satisfies StockQuote;
    })
  );

  return quotes;
}

const SCOREBOARD_URLS: Record<string, string> = {
  NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
};

const TEAM_MATCHERS: Record<string, string[]> = {
  warriors: ['golden state warriors', 'warriors', 'gsw'],
  '49ers': ['san francisco 49ers', '49ers', 'sf'],
  giants: ['san francisco giants', 'giants', 'sf'],
};

export async function getFavoriteGames(teamKeys: string[]): Promise<SportsGame[]> {
  const responses = await Promise.all(
    Object.entries(SCOREBOARD_URLS).map(async ([league, url]) => {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return { league, events: [] as any[] };
      const data = await res.json();
      return { league, events: Array.isArray(data?.events) ? data.events : [] };
    })
  );

  const normalizedTeamKeys = teamKeys.map((t) => t.toLowerCase());
  const games: SportsGame[] = [];

  for (const { league, events } of responses) {
    for (const event of events) {
      const comp = event?.competitions?.[0];
      const competitors = comp?.competitors || [];
      const home = competitors.find((c: any) => c.homeAway === 'home');
      const away = competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;

      const homeNames = teamStrings(home);
      const awayNames = teamStrings(away);
      const matchedKey = normalizedTeamKeys.find((key) => {
        const aliases = TEAM_MATCHERS[key] || [key];
        return aliases.some((alias) => homeNames.includes(alias) || awayNames.includes(alias));
      });

      if (!matchedKey) continue;

      games.push({
        id: event.id || `${league}-${home.team?.abbreviation}-${away.team?.abbreviation}`,
        league,
        away: away.team?.displayName || away.team?.shortDisplayName || 'Away',
        home: home.team?.displayName || home.team?.shortDisplayName || 'Home',
        awayScore: toNumber(away.score),
        homeScore: toNumber(home.score),
        status: event.status?.type?.shortDetail || event.status?.type?.description || 'Scheduled',
        venue: comp?.venue?.fullName || '',
        startTime: event.date || '',
        favoriteTeam: favoriteTeamNameForKey(matchedKey, home, away),
      });
    }
  }

  return games;
}

function favoriteTeamNameForKey(key: string, home: any, away: any) {
  const aliases = TEAM_MATCHERS[key] || [key];
  const homeName = home.team?.displayName || home.team?.shortDisplayName || '';
  const awayName = away.team?.displayName || away.team?.shortDisplayName || '';
  const matchedHome = aliases.some((alias) => teamStrings(home).includes(alias));
  return matchedHome ? homeName : awayName;
}

function teamStrings(competitor: any) {
  const team = competitor?.team || {};
  return [team.displayName, team.shortDisplayName, team.abbreviation, team.name]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
}

function cleanText(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSource(value: string) {
  return cleanText(value).replace(/\s-\sGoogle News$/i, '');
}

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
