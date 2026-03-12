import { NextResponse } from 'next/server';
import { getGoogleNewsArticles } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const articles = await getGoogleNewsArticles('latest world news OR global markets OR technology', 'Global');
    return NextResponse.json({ articles, source: 'Google News RSS' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load global news.' },
      { status: 500 }
    );
  }
}
