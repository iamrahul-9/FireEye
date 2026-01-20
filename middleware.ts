import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Refresh Session
    const { data: { user } } = await supabase.auth.getUser()

    // 3. Define Protected Routes
    const protectedPaths = ['/dashboard', '/clients', '/inspections', '/reports', '/admin']
    const adminPaths = ['/admin', '/settings/roles']

    const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
    const isAdminPath = adminPaths.some(path => request.nextUrl.pathname.startsWith(path))

    // 4. Handle Redirects
    if (isProtected && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user) {
        // Check Role for Admin Paths
        if (isAdminPath) {
            // Fetch Profile Role (Cached check or quick query)
            // Note: In middleware, we can't easily query 'profiles' without exposing service key or extra logic.
            // For better performance, we often store role in user_metadata or just let the page handle specifics if strict security is needed.
            // However, let's try a quick check if possible, or rely on RLS + Page-side checks for specific data.
            // A common pattern is adding role to JWT. For now, we will rely on Page usage, 
            // BUT we can enforce a basic check if we had Custom Claims.

            // Sidenote: Since we updated the trigger to add role to 'profiles', we should rely on that. 
            // Fetching detailed profile in middleware might be expensive on every request.
            // Let's settle for Basic Auth check here, and Page-level redirection for Roles for now 
            // OR assume we will update JWT later.

            // For this implementation, we will allow authenticated users to hit the route, 
            // but the Page itself (or Layout) should verify the "Admin" role and show 403.
        }

        // Redirect logged-in users away from Login/Signup
        if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
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
         * - api/ (API routes - handled separately or let middleware pass)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
