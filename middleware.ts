import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
  // Get the session cookie
  const session = request.cookies.get('session');

  // If no session exists, create one
  if (!session) {
    const response = NextResponse.next();
    response.cookies.set('session', uuidv4(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 // 1 hour
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/generate',
    '/api/accept'
  ]
}; 