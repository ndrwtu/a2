'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Clock3,
  ExternalLink,
  GripVertical,
  MapPin,
  Newspaper,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Sparkles,
  StickyNote,
  TrendingUp,
  Trophy,
  X,
  Circle,
} from 'lucide-react';

type SportsGame = {
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

type NewsArticle = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  summary: string;
};

type StockQuote = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketState: string;
  updatedAt: string;
};

type TodoItem = {
  id: string;
  text: string;
  done: boolean;
  pinned: boolean;
  createdAt: number;
};

const DEFAULT_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA'];
const DEFAULT_NOTE = `Today\n- Check Bay Area news\n- Review favorite team games\n- Scan portfolio movers\n- Update priorities`;
const DEFAULT_TODOS: TodoItem[] = [
  { id: crypto.randomUUID(), text: 'Read San Mateo headlines', done: false, pinned: true, createdAt: Date.now() },
  { id: crypto.randomUUID(), text: 'Check watchlist after refresh', done: false, pinned: false, createdAt: Date.now() + 1 },
  { id: crypto.randomUUID(), text: "Review tonight's sports slate", done: true, pinned: false, createdAt: Date.now() + 2 },
];

const API = {
  sports: '/api/dashboard/sports?teams=warriors,49ers,giants',
  globalNews: '/api/dashboard/news/global',
  localNews: '/api/dashboard/news/local?city=San%20Mateo',
  stocks: (symbols: string[]) => `/api/dashboard/stocks?symbols=${encodeURIComponent(symbols.join(','))}`,
};

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage failures
    }
  }, [key, value]);

  return [value, setValue] as const;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function formatCurrency(value: number | null) {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatSignedNumber(value: number | null) {
  if (typeof value !== 'number') return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

function formatPct(value: number | null) {
  if (typeof value !== 'number') return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function timeAgo(input: string | null | undefined) {
  if (!input) return 'Just updated';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function useDashboardData(symbols: string[]) {
  const [sports, setSports] = useState<SportsGame[]>([]);
  const [globalNews, setGlobalNews] = useState<NewsArticle[]>([]);
  const [localNews, setLocalNews] = useState<NewsArticle[]>([]);
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const firstLoad = !lastUpdated;
    if (firstLoad) setLoading(true);
    else setRefreshing(true);

    try {
      setError('');
      const [sportsRes, globalRes, localRes, stocksRes] = await Promise.all([
        fetchJSON<{ games: SportsGame[] }>(API.sports),
        fetchJSON<{ articles: NewsArticle[] }>(API.globalNews),
        fetchJSON<{ articles: NewsArticle[] }>(API.localNews),
        fetchJSON<{ quotes: StockQuote[] }>(API.stocks(symbols)),
      ]);
      setSports(sportsRes.games || []);
      setGlobalNews(globalRes.articles || []);
      setLocalNews(localRes.articles || []);
      setStocks(stocksRes.quotes || []);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lastUpdated, symbols]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { sports, globalNews, localNews, stocks, loading, refreshing, error, lastUpdated, refresh };
}

function CardHeaderBlock({ icon: Icon, title, subtitle, action }: any) {
  return (
    <div className="card-header">
      <div className="card-title-row">
        <div className="icon-pill"><Icon size={16} /></div>
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-subtitle">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div className="loading-state">{label}</div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertCircle size={16} />
        <span>{message}</span>
      </div>
      <button className="ghost-btn" onClick={onRetry}>Retry</button>
    </div>
  );
}

function Scoreboards({ games, loading, refreshing, onRefresh }: { games: SportsGame[]; loading: boolean; refreshing: boolean; onRefresh: () => void }) {
  return (
    <section className="card col-7 col-12">
      <CardHeaderBlock
        icon={Trophy}
        title="Favorite team scoreboards"
        subtitle="Live scoreboards and scheduled games"
        action={<button className="icon-btn" onClick={onRefresh}><RefreshCw size={16} className={refreshing ? 'spin' : ''} /></button>}
      />
      <div className="card-content">
        {loading ? <LoadingState label="Loading live sports..." /> : games.length === 0 ? <div className="empty-state">No games returned right now.</div> : (
          <div className="score-grid">
            {games.map((game, index) => {
              const favorite = (game.favoriteTeam || '').toLowerCase();
              const favoriteIsHome = game.home.toLowerCase() === favorite;
              const favoriteScore = favoriteIsHome ? game.homeScore : game.awayScore;
              const otherScore = favoriteIsHome ? game.awayScore : game.homeScore;
              const leading = typeof favoriteScore === 'number' && typeof otherScore === 'number' && favoriteScore >= otherScore;
              return (
                <motion.div key={game.id || index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="score-item">
                  <div className="score-head">
                    <span className="badge">{game.league}</span>
                    <span className="soft" style={{ fontSize: 12 }}>{game.venue || game.startTime}</span>
                  </div>
                  <div className="team-line">
                    <div>
                      <div className="soft" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Away</div>
                      <div className={game.away.toLowerCase() === favorite ? 'favorite' : ''}>{game.away}</div>
                    </div>
                    <div className="score-num">{game.awayScore ?? '—'}</div>
                  </div>
                  <div className="team-line">
                    <div>
                      <div className="soft" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em' }}>Home</div>
                      <div className={game.home.toLowerCase() === favorite ? 'favorite' : ''}>{game.home}</div>
                    </div>
                    <div className="score-num">{game.homeScore ?? '—'}</div>
                  </div>
                  <div className="divider" />
                  <div className="row-between" style={{ marginTop: 12 }}>
                    <span className="muted" style={{ fontSize: 14 }}>{game.status}</span>
                    <span className={`badge ${leading ? 'state-good' : 'state-watch'}`}>{leading ? 'Competitive' : 'Watching'}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function NewsColumn({ icon, title, subtitle, articles, loading }: { icon: any; title: string; subtitle: string; articles: NewsArticle[]; loading: boolean }) {
  return (
    <section className="card col-4 col-12">
      <CardHeaderBlock icon={icon} title={title} subtitle={subtitle} />
      <div className="card-content">
        {loading ? <LoadingState label={`Loading ${title.toLowerCase()}...`} /> : articles.length === 0 ? <div className="empty-state">No articles returned right now.</div> : (
          <div className="scroll-list">
            {articles.map((article) => (
              <motion.a key={article.id} href={article.url} target="_blank" rel="noreferrer" className="news-item" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="row-between">
                  <span className="badge">{article.category || 'News'}</span>
                  <ExternalLink size={15} className="soft" />
                </div>
                <div className="news-title">{article.title}</div>
                {article.summary ? <div className="news-summary">{article.summary}</div> : null}
                <div className="news-meta">
                  <span>{article.source}</span>
                  <span>{timeAgo(article.publishedAt)}</span>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function NotesWidget() {
  const [notes, setNotes] = usePersistentState('dashboard-notes', DEFAULT_NOTE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(true);
    const id = window.setTimeout(() => setSaved(false), 1000);
    return () => window.clearTimeout(id);
  }, [notes]);

  return (
    <section className="card col-4 col-12">
      <CardHeaderBlock icon={StickyNote} title="Notes" subtitle="Persistent scratchpad" action={<span className="badge">{saved ? 'Saved' : 'Auto-save'}</span>} />
      <div className="card-content">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write anything here..." />
      </div>
    </section>
  );
}

function TodoWidget() {
  const [items, setItems] = usePersistentState<TodoItem[]>('dashboard-todos', DEFAULT_TODOS);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'pinned'>('all');
  const ref = useRef<HTMLInputElement | null>(null);

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    setItems([{ id: crypto.randomUUID(), text, done: false, pinned: false, createdAt: Date.now() }, ...items]);
    setDraft('');
    ref.current?.focus();
  };

  const filtered = useMemo(() => {
    const arranged = [...items].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    if (filter === 'active') return arranged.filter((i) => !i.done);
    if (filter === 'done') return arranged.filter((i) => i.done);
    if (filter === 'pinned') return arranged.filter((i) => i.pinned);
    return arranged;
  }, [items, filter]);

  const stats = useMemo(() => ({
    total: items.length,
    completed: items.filter((i) => i.done).length,
    active: items.filter((i) => !i.done).length,
  }), [items]);

  return (
    <section className="card col-7 col-12">
      <CardHeaderBlock icon={CheckSquare} title="To-do" subtitle="Drag, pin, filter, clear, and persist" action={<span className="badge">{stats.active} open</span>} />
      <div className="card-content">
        <div className="field-row" style={{ marginBottom: 14 }}>
          <input ref={ref} className="text-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="Add a task" />
          <button className="refresh-btn" onClick={addItem}><Plus size={16} /></button>
        </div>

        <div className="todo-controls">
          <div className="tab-row">
            {(['all', 'active', 'done', 'pinned'] as const).map((tab) => (
              <button key={tab} className={`tab-btn ${filter === tab ? 'active' : ''}`} onClick={() => setFilter(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
            ))}
          </div>
          <button className="ghost-btn" onClick={() => setItems(items.filter((i) => !i.done))}>Clear completed</button>
        </div>

        <div className="stats">
          <span className="stat-chip">{stats.total} total</span>
          <span className="stat-chip">{stats.completed} done</span>
        </div>

        <Reorder.Group axis="y" values={items} onReorder={setItems} className="todo-list">
          <AnimatePresence initial={false}>
            {filtered.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <motion.div layout exit={{ opacity: 0, scale: 0.98 }} className="todo-item">
                  <GripVertical size={16} className="soft" />
                  <button className="todo-action" onClick={() => setItems(items.map((i) => i.id === item.id ? { ...i, done: !i.done } : i))}>
                    {item.done ? <CheckCircle2 size={18} className="up" /> : <Circle size={18} className="soft" />}
                  </button>
                  <div className={`todo-text ${item.done ? 'done' : ''}`}>{item.text}</div>
                  <button className="todo-action" onClick={() => setItems(items.map((i) => i.id === item.id ? { ...i, pinned: !i.pinned } : i))}>
                    {item.pinned ? <Pin size={16} className="favorite" /> : <PinOff size={16} className="soft" />}
                  </button>
                  <button className="todo-action" onClick={() => setItems(items.filter((i) => i.id !== item.id))}><X size={16} className="soft" /></button>
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </section>
  );
}

function StocksWidget({ quotes, loading, refreshing, onRefresh, symbols, setSymbols }: {
  quotes: StockQuote[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  symbols: string[];
  setSymbols: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [draft, setDraft] = useState('');

  const addSymbol = () => {
    const symbol = draft.trim().toUpperCase();
    if (!symbol || symbols.includes(symbol)) {
      setDraft('');
      return;
    }
    setSymbols((prev) => [...prev, symbol]);
    setDraft('');
  };

  return (
    <section className="card col-5 col-12">
      <CardHeaderBlock
        icon={TrendingUp}
        title="Stocks"
        subtitle="Live prices with add/remove tickers"
        action={<button className="icon-btn" onClick={onRefresh}><RefreshCw size={16} className={refreshing ? 'spin' : ''} /></button>}
      />
      <div className="card-content">
        <div className="field-row">
          <input className="text-input" value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && addSymbol()} placeholder="Add ticker, e.g. META" />
          <button className="refresh-btn" onClick={addSymbol}><Plus size={16} /></button>
        </div>
        <div className="chips">
          {symbols.map((symbol) => (
            <span key={symbol} className="chip">{symbol} <button className="todo-action" onClick={() => setSymbols((prev) => prev.filter((s) => s !== symbol))}><X size={14} /></button></span>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {loading ? <LoadingState label="Loading live prices..." /> : quotes.length === 0 ? <div className="empty-state">Add at least one ticker to load quotes.</div> : quotes.map((quote) => {
            const up = typeof quote.change === 'number' ? quote.change >= 0 : true;
            return (
              <motion.div key={quote.symbol} className="quote-item" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{quote.symbol}</div>
                    <div className="soft" style={{ fontSize: 12 }}>{quote.name || quote.marketState}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="quote-price">{formatCurrency(quote.price)}</div>
                    <div className={up ? 'up' : 'down'} style={{ fontSize: 12 }}>{formatSignedNumber(quote.change)} · {formatPct(quote.changePercent)}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  const [symbols, setSymbols] = usePersistentState<string[]>('dashboard-stock-symbols', DEFAULT_TICKERS);
  const { sports, globalNews, localNews, stocks, loading, refreshing, error, lastUpdated, refresh } = useDashboardData(symbols);

  return (
    <main className="page-shell">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="hero">
            <div>
              <div className="kicker"><Sparkles size={14} /> Personal command center</div>
              <h1 className="hero-title">Your Dashboard</h1>
              <p className="hero-copy">A truly live dashboard for favorite team scoreboards, global headlines, San Mateo local news, live stock prices, notes, and a capable task system.</p>
            </div>
            <button className="refresh-btn" onClick={refresh}><RefreshCw size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Refresh data</button>
          </div>

          <div className="status-row">
            <span className="status-pill"><Activity size={14} /> Live dashboard</span>
            <span className="status-pill"><Clock3 size={14} /> {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : 'Waiting for first refresh'}</span>
            <span className="status-pill"><MapPin size={14} /> Local news: San Mateo</span>
          </div>

          <ErrorBanner message={error} onRetry={refresh} />
        </motion.div>

        <div className="grid">
          <Scoreboards games={sports} loading={loading} refreshing={refreshing} onRefresh={refresh} />
          <StocksWidget quotes={stocks} loading={loading} refreshing={refreshing} onRefresh={refresh} symbols={symbols} setSymbols={setSymbols} />
          <NewsColumn icon={Newspaper} title="Global news" subtitle="Live headlines from current sources" articles={globalNews} loading={loading} />
          <NewsColumn icon={MapPin} title="San Mateo news" subtitle="Current local coverage around San Mateo" articles={localNews} loading={loading} />
          <NotesWidget />
          <TodoWidget />
          <section className="card col-5 col-12">
            <CardHeaderBlock icon={Activity} title="Live wiring" subtitle="How this starter is already connected" />
            <div className="card-content helper-stack">
              <div className="helper-item">Stocks use Finnhub server-side quotes, so your browser never exposes the API key.</div>
              <div className="helper-item">Global and San Mateo news come from live Google News RSS search feeds normalized through your own Next.js routes.</div>
              <div className="helper-item">Sports scoreboards use ESPN public scoreboard feeds across NBA, NFL, and MLB, filtered to your favorite teams.</div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
