import { NextRequest, NextResponse } from 'next/server';
import { getFavoriteGames } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const teamsParam = request.nextUrl.searchParams.get('teams') || 'warriors,49ers,giants';
  const teams = teamsParam.split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const games = await getFavoriteGames(teams);
    return NextResponse.json({ games, source: 'ESPN public scoreboard feeds' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load sports scores.' },
      { status: 500 }
    );
  }
}
