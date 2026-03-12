import { NextRequest, NextResponse } from 'next/server';
import { getFinnhubQuotes } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get('symbols') || 'AAPL,NVDA,MSFT,TSLA';
  const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const quotes = await getFinnhubQuotes(symbols);
    return NextResponse.json({ quotes, source: 'Finnhub' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load stock quotes.' },
      { status: 500 }
    );
  }
}
