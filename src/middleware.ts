// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await updateSession(request)

  // Refresh session so it doesn't expire
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protected routes logic
  if (!user && (pathname.startsWith('/app') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in, check if they need onboarding
  if (user && (pathname.startsWith('/app') || pathname === '/login')) {
    // Check if user has a membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    // If no membership, redirect to onboarding
    if (!membership && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // If has membership and trying to access login, redirect to app
    if (membership && pathname === '/login') {
      return NextResponse.redirect(new URL('/app', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
