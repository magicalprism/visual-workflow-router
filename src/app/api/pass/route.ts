import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as any;
    if (!body || body.password !== process.env.PASSWORD) {
      return new Response('unauthorized', { status: 401 });
    }

    // Hash the provided password
    const hash = crypto.createHash('sha256').update(body.password).digest('hex');
    const expectedHash = process.env.ACCESS_PASSWORD_HASH;

    if (!expectedHash) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Constant-time comparison
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(hash),
        Buffer.from(expectedHash)
      );
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create response with cookie
    const response = NextResponse.json({ success: true });
    
    const cookieName = process.env.ACCESS_COOKIE_NAME || 'vwf_access';
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    
    response.cookies.set(cookieName, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
