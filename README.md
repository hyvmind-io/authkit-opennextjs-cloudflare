# @hyvmind/authkit-opennextjs-cloudflare

**Cloudflare Workers-compatible fork of [`@workos-inc/authkit-nextjs`](https://github.com/workos/authkit-nextjs) (v2.14.0)**

Drop-in replacement for deploying WorkOS AuthKit with Next.js on Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

> Only the package name changes. All imports, APIs, and features work exactly as documented upstream.

## Why does this fork exist?

Cloudflare Workers don't have a traditional `process.env` available at module load time. When `@opennextjs/cloudflare` deploys a Next.js app to Workers, it calls `populateProcessEnv()` to populate `process.env` from the Worker's bindings — but this happens **at request time**, not when modules are first imported.

The upstream `@workos-inc/authkit-nextjs` reads all environment variables into module-level constants at import time:

```ts
// upstream env-variables.ts — evaluated once when the module is imported
const WORKOS_API_KEY = process.env.WORKOS_API_KEY ?? '';
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID ?? '';
// ... all values are captured as empty strings before populateProcessEnv() runs
```

On Cloudflare Workers, every variable resolves to `''` or `undefined` because the module loads before the request context is available. This breaks **all** authentication — middleware, session management, token refresh, everything.

This fork converts those module-level constants to **lazy function calls** that read `process.env` at the moment the value is actually needed (i.e., during a request, after `populateProcessEnv()` has run).

## All features work

Everything from the upstream library works on Cloudflare Workers with this fork:

- **Middleware / Proxy** — `authkitMiddleware()` and composable `authkit()` function
- **Server components** — `withAuth()`, `getSignInUrl()`, `getSignUpUrl()`, `signOut()`
- **Client components** — `useAuth()`, `useAccessToken()`, `AuthKitProvider`, `Impersonation`
- **Route handlers** — `handleAuth()` callback route
- **Session management** — `refreshSession()`, `saveSession()`, `getTokenClaims()`
- **API key validation** — `validateApiKey()`
- **Direct WorkOS client** — `getWorkOS()`
- **CDN cache headers** — Automatic cache prevention for authenticated requests
- **Middleware auth** — Secure-by-default with `unauthenticatedPaths`
- **Eager auth** — Synchronous access token on initial page load
- **Feature flags** — `featureFlags` from `withAuth()`

## Installation

```bash
pnpm add @hyvmind/authkit-opennextjs-cloudflare
```

```bash
npm install @hyvmind/authkit-opennextjs-cloudflare
```

```bash
yarn add @hyvmind/authkit-opennextjs-cloudflare
```

## Configuration for Cloudflare Workers

On Cloudflare, environment variables are configured through `wrangler.toml`, secrets, and `.dev.vars` — not `.env.local`.

### 1. Non-secret variables in `wrangler.toml`

Add non-secret environment variables to your `wrangler.toml`:

```toml
[vars]
NEXT_PUBLIC_WORKOS_REDIRECT_URI = "https://your-app.example.com/auth/callback"
# Optional
# WORKOS_COOKIE_MAX_AGE = "34560000"
# WORKOS_COOKIE_DOMAIN = "example.com"
# WORKOS_COOKIE_NAME = "wos-session"
# WORKOS_API_HOSTNAME = "api.workos.com"
# WORKOS_API_HTTPS = "true"
# WORKOS_API_PORT = ""
# WORKOS_COOKIE_SAMESITE = "lax"
```

### 2. Secrets via `wrangler secret put`

Sensitive values must be stored as [encrypted secrets](https://developers.cloudflare.com/workers/configuration/secrets/):

```bash
wrangler secret put WORKOS_CLIENT_ID
# Paste: client_...

wrangler secret put WORKOS_API_KEY
# Paste: sk_test_...

wrangler secret put WORKOS_COOKIE_PASSWORD
# Paste a 32+ character password (generate with: openssl rand -base64 24)
```

### 3. Local development with `.dev.vars`

For local development with `wrangler dev` or `next dev` via `@opennextjs/cloudflare`, create a `.dev.vars` file in your project root:

```sh
WORKOS_CLIENT_ID="client_..."
WORKOS_API_KEY="sk_test_..."
WORKOS_COOKIE_PASSWORD="<your password>"
NEXT_PUBLIC_WORKOS_REDIRECT_URI="http://localhost:3000/auth/callback"
```

> **Note:** Add `.dev.vars` to your `.gitignore`. Never commit secrets.

### Required environment variables

| Variable                          | Description                                                                |
| --------------------------------- | -------------------------------------------------------------------------- |
| `WORKOS_CLIENT_ID`                | Your WorkOS Client ID (from the [dashboard](https://dashboard.workos.com)) |
| `WORKOS_API_KEY`                  | Your WorkOS API Key (from the [dashboard](https://dashboard.workos.com))   |
| `WORKOS_COOKIE_PASSWORD`          | Encryption key for the session cookie (min. 32 characters)                 |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | OAuth callback URL configured in your WorkOS dashboard                     |

### Optional environment variables

| Variable                 | Default               | Description                                                                               |
| ------------------------ | --------------------- | ----------------------------------------------------------------------------------------- |
| `WORKOS_COOKIE_MAX_AGE`  | `34560000` (400 days) | Maximum age of the cookie in seconds                                                      |
| `WORKOS_COOKIE_DOMAIN`   | None                  | Domain for the cookie. When empty, the cookie is only valid for the current domain        |
| `WORKOS_COOKIE_NAME`     | `'wos-session'`       | Name of the session cookie                                                                |
| `WORKOS_API_HOSTNAME`    | `'api.workos.com'`    | Base WorkOS API URL                                                                       |
| `WORKOS_API_HTTPS`       | `true`                | Whether to use HTTPS in API calls                                                         |
| `WORKOS_API_PORT`        | None                  | Port to use for API calls. When not set, uses standard ports (443 for HTTPS, 80 for HTTP) |
| `WORKOS_COOKIE_SAMESITE` | `'lax'`               | SameSite attribute for cookies. Options: `'lax'`, `'strict'`, or `'none'`                 |

> [!WARNING]
> Setting `WORKOS_COOKIE_SAMESITE='none'` allows cookies to be sent in cross-origin contexts (like iframes), but reduces protection against CSRF attacks. This setting forces cookies to be secure (HTTPS only) and should only be used when absolutely necessary.

## Usage

The only change from upstream is the import path. Replace the package name in all imports:

```diff
- import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
+ import { authkitMiddleware } from '@hyvmind/authkit-opennextjs-cloudflare';
```

```diff
- import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
+ import { AuthKitProvider } from '@hyvmind/authkit-opennextjs-cloudflare/components';
```

### Quick start

**1. Set up your callback route** (`app/auth/callback/route.ts`):

```ts
import { handleAuth } from '@hyvmind/authkit-opennextjs-cloudflare';

export const GET = handleAuth();
```

**2. Add middleware** (`middleware.ts`):

```ts
import { authkitMiddleware } from '@hyvmind/authkit-opennextjs-cloudflare';

export default authkitMiddleware();

export const config = { matcher: ['/', '/dashboard/:path*'] };
```

**3. Wrap your layout** (`app/layout.tsx`):

```tsx
import { AuthKitProvider } from '@hyvmind/authkit-opennextjs-cloudflare/components';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthKitProvider>{children}</AuthKitProvider>
      </body>
    </html>
  );
}
```

**4. Use in server components:**

```tsx
import { withAuth } from '@hyvmind/authkit-opennextjs-cloudflare';

export default async function DashboardPage() {
  const { user } = await withAuth({ ensureSignedIn: true });
  return <p>Welcome, {user.firstName}!</p>;
}
```

### Complete API documentation

For the full API reference — including composable middleware, session refresh, eager auth, impersonation, access tokens, custom state, API key validation, and advanced patterns — see the **[upstream documentation](https://github.com/workos/authkit-nextjs#readme)**.

All examples from upstream apply here. Just replace the import package name.

## Versioning and upstream sync

This fork uses the **same version number** as the upstream `@workos-inc/authkit-nextjs` release it is based on.

| This package | Upstream                            | Notes                                 |
| ------------ | ----------------------------------- | ------------------------------------- |
| `2.14.0`     | `@workos-inc/authkit-nextjs@2.14.0` | Initial Cloudflare-compatible release |

**Sync strategy:**

1. The `master` branch tracks the upstream `main` branch
2. When a new upstream version is released, it is merged and published with the same version number
3. The diff from upstream is kept minimal — only the changes required for Cloudflare Workers compatibility

## Technical differences from upstream

The fork makes one targeted change to how environment variables are accessed.

### Upstream: module-level constants

```ts
// env-variables.ts (upstream)
const WORKOS_API_KEY = process.env.WORKOS_API_KEY ?? '';
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID ?? '';
const WORKOS_COOKIE_PASSWORD = process.env.WORKOS_COOKIE_PASSWORD ?? '';
const WORKOS_REDIRECT_URI = process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? '';

export { WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, WORKOS_REDIRECT_URI };
```

These constants are evaluated **once** when the module is first imported. On Node.js / Vercel, `process.env` is populated before any code runs, so this works fine.

### This fork: lazy access via function calls

```ts
// env-variables.ts (this fork)
export function WORKOS_API_KEY() {
  return process.env.WORKOS_API_KEY ?? '';
}
export function WORKOS_CLIENT_ID() {
  return process.env.WORKOS_CLIENT_ID ?? '';
}
export function WORKOS_COOKIE_PASSWORD() {
  return process.env.WORKOS_COOKIE_PASSWORD ?? '';
}
export function WORKOS_REDIRECT_URI() {
  return process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? '';
}
```

Each call site reads `process.env` **at invocation time**, which is during a request — after `@opennextjs/cloudflare` has called `populateProcessEnv()`. This is the only structural change; all other code remains identical to upstream.

### Why not contribute upstream?

This is a runtime-environment-specific concern. The upstream library is designed for Node.js runtimes (Vercel, self-hosted, Docker) where `process.env` is always available at import time. The lazy access pattern is a valid trade-off for Cloudflare Workers but adds unnecessary indirection for the primary use case. If the upstream project adopts lazy env access natively, this fork will be deprecated.

## License

MIT License - see [LICENSE](./LICENSE).

This fork maintains the same MIT license as the upstream project.

## Credits

This package is a minimal fork of **[`@workos-inc/authkit-nextjs`](https://github.com/workos/authkit-nextjs)** by [WorkOS](https://workos.com). All authentication logic, session management, middleware, and API design are the work of the WorkOS team.

This fork is maintained by [Hyvmind](https://github.com/hyvmind-io) and only adds the changes necessary for Cloudflare Workers compatibility via `@opennextjs/cloudflare`.
