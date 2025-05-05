// src/app/api/ping/route.ts
import { NextResponse } from 'next/server'

export function GET() {
  console.log('🏓 /api/ping hit')   // server‑side log
  return NextResponse.json({ pong: true })
}
