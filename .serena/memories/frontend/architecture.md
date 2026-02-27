# Frontend Architecture

## Config
- Tailwind v3 (PostCSS), darkMode: "class"
- shadcn/ui neutral base, CSS variables
- Path alias: @/ → src/
- Geist fonts: @font-face in index.css, variable fonts in public/fonts/
- borderRadius: capped at md (no xl/2xl/3xl) — theme.borderRadius override

## CSS Variables (index.css)
Light: background(100%), foreground(4%), surface(96%), border(90%), muted(96%), muted-foreground(45%), accent(4%)
Dark: background(4%), foreground(98%), surface(7%), border(13%), muted(7%), muted-foreground(32%), accent(98%)

## App Shell
- AppShell: flex-col h-screen, header (h-12, border-b) + main (flex-1 overflow-auto p-4)
- Header: "MayHapotTabi" font-mono left, ThemeToggle right
- ThemeToggle: localStorage "mayhapottabi-theme", toggles .dark on html, Phosphor Sun/Moon icons

## Routing (App.tsx)
- BrowserRouter wraps everything
- / → redirect based on session
- /login → Login (unprotected)
- /dashboard, /chat/:docId → ProtectedRoute (redirects to /login if !authed)
- useAuth() called in App for session/loading state
- Toaster from sonner mounted globally inside BrowserRouter

## useAuth Hook (src/hooks/useAuth.ts)
Returns: { user, session, loading, signIn, signUp, signOut }
- getSession() on mount → setLoading(false)
- onAuthStateChange listener with cleanup
- signIn(email, pw) → supabase.auth.signInWithPassword → { error }
- signUp(email, pw) → supabase.auth.signUp → { error }
- signOut() → supabase.auth.signOut() + window.location.replace("/login")

## Login Page (src/pages/Login.tsx)
- Two modes: "signin" | "signup" — toggled with text link (no tabs)
- Fields: email, password, [signup only] confirmPassword
- Client-side password match validation before Supabase call
- signIn success → navigate("/dashboard")
- signUp success → toast.success (stay on page)
- Errors → toast.error(error.message)
- Loading: disabled button + CircleNotch animate-spin
- Button style: bg-accent text-background (inverted, no shadcn default)

## Lib
- supabase.ts: createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) — throws if missing
- api.ts: axios instance with baseURL=VITE_BACKEND_URL, interceptor attaches Bearer token

## shadcn Components Installed
button, input, label, card, separator, skeleton, sonner

## Env Vars (.env.local)
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BACKEND_URL=http://localhost:3000
