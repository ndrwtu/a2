import { NextRequest, NextResponse } from 'next/server';
import { getGoogleNewsArticles } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city') || 'San Mateo';

  try {
    const articles = await getGoogleNewsArticles(`${city} California local news`, 'Local');
    return NextResponse.json({ articles, source: 'Google News RSS', city });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load local news.' },
      { status: 500 }
    );
  }
}
