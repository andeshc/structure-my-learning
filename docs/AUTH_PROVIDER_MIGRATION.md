# Auth Provider Migration Plan (Auth0 / Clerk)

Status: **design only — not implemented.** This documents what it would take to move
off the in-house Passport + JWT stack to a hosted identity provider (Clerk or Auth0).

---

## 0. Decision (as of 2026-06-29): stay in-built

**Verdict: keep the in-house auth. Do not migrate to Clerk/Auth0 yet.**

Reasoning specific to where we are:
- **Active providers are Google, GitHub, LinkedIn** — not six. (Apple/Facebook aren't
  configured; Microsoft works but its Azure app still shows an "unverified" consent
  screen pending publisher verification, so it's hidden too.)
- That trio is **strong coverage for this audience** (Google = most consumers, GitHub =
  technical users, LinkedIn = the professional/upskilling angle). Apple/Facebook/Microsoft
  are diminishing returns here (Apple mainly matters for an iOS app; Facebook login is
  declining; Microsoft is enterprise-flavored).
- The only argument that pointed toward a managed provider was *multi-provider setup
  friction* — but that friction blocks **low-value** additions, so it isn't worth a
  paid, per-MAU migration plus the data-migration risk in §5–6.
- The auth is already built, working, stateless, and well-factored (small choke points).

**So the move is: lean into Google/GitHub/LinkedIn, trim the rest, don't migrate.**

### Triggers that WOULD flip this to Clerk (revisit if any occur)
- Need for **MFA / passkeys / enterprise SSO (SAML)** — e.g. selling to businesses.
- A **compliance or security-review** requirement (SOC 2, customer questionnaire).
- **Auth maintenance starts eating meaningful time** (repeated provider breakage, abuse).
- Desire for **managed breach/bot detection** we don't want to build.
- Team grows and we no longer want to own auth security.

> Note: "I want more social login buttons" is **not** a trigger. If breadth ever does
> matter, Clerk's shared dev credentials are the lever — but production setup bureaucracy
> (esp. Apple) doesn't disappear with a managed provider.

If a trigger fires, **Clerk** is the recommended target for this React + Express stack;
execute §2–§8 below.

---

## 1. Current architecture (what we're replacing)

Auth today is in-house and stateless. The whole surface funnels through a few choke
points, which is what makes a migration tractable.

| Concern | Location | Notes |
|---|---|---|
| Access token mint | `server/src/services/token.service.js` → `createAccessToken` | HS256, signed with `JWT_SECRET`, `expiresIn: 24h`, payload `{ sub: user.id, email }` |
| Refresh token | `token.service.js` → `createRefreshToken` / `setRefreshCookie` | 48-byte random, stored in `refresh_tokens` table, delivered as httpOnly cookie (30d) |
| **Token verify (choke point)** | `server/src/middleware/auth.js` → `requireAuth` | Bearer header → `jwt.verify(token, JWT_SECRET)` → `users.findUserById(payload.sub)` |
| Identity store | `server/src/db/users.js`; tables `users`, `oauth_accounts`, `refresh_tokens`, `email_verification_tokens` | |
| Social login | `server/src/passport.js` (Google, GitHub, Apple, Facebook, LinkedIn, Microsoft) + `/api/auth/*/callback` routes | LinkedIn uses OIDC via `passport-oauth2`; others via per-provider strategies |
| Password login | `auth.routes.js` `/register` + `/login`, bcrypt, email verification | |
| Client token store | `client/src/api/client.js` | Access token held in a module variable; attaches `Authorization: Bearer`; auto-refreshes on 401 via cookie |
| Client auth state | `client/src/context/AuthContext.jsx` | |
| Account UI | `client/src/pages/AccountPage.jsx` → `SecuritySection` | Password change + "Connected accounts" |

**Verification blast radius is small:** `requireAuth` is consumed by only two route
files (`auth.routes.js`, `share.routes.js`). Token minting lives entirely in
`token.service.js`. So most of the migration concentrates in **~4 files**:
`middleware/auth.js`, `services/token.service.js`, `client/src/api/client.js`,
`client/src/context/AuthContext.jsx` — plus deleting `passport.js`.

---

## 2. The decision that drives everything

**Who owns the user record and the session?** This is the real fork.

### Option 1 — Provider owns identity & sessions; our backend is a resource server (recommended)
This is the intended way to use Clerk/Auth0 and where the value is.
- Frontend uses their hosted/embedded login UI and SDK; we delete our login/register/social UI.
- Backend stops minting tokens and instead **verifies the provider's RS256 JWT against
  their JWKS endpoint**, then maps the provider `sub` to a local `users` row.
- `passport.js` is deleted; social connections move to the provider dashboard. All the
  `*_CLIENT_ID/SECRET/CALLBACK_URL` env scaffolding goes away.

### Option 2 — Provider as just another upstream social IdP, keep our JWT layer
Add Auth0/Clerk as one more OIDC strategy in `passport.js`, keep everything else. Small
change, but retains all the maintenance burden (our tokens, refresh table, password
reset, email verification). **Not recommended** — if we move, move to Option 1.

**The rest of this doc assumes Option 1.**

---

## 3. What we keep, re-key, and retire (Option 1)

### Keep but re-key: the `users` table
`users.id` (`usr_...`) is the FK target for `guides`, `collections`, `subscriptions`,
`ltd_purchases`, `subtopic_progress`, `guide_adoptions`, `shared_guide_views`,
`email_verification_tokens` — all `ON DELETE CASCADE`. **Do not repoint that graph.**
Instead add a mapping column and provision-on-first-login (JIT):

```sql
-- migration in server/src/db/init.js (idempotent, same pattern as the provider CHECK widen)
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;  -- provider sub, e.g. Clerk user_2ab...
```

### Retire
- `server/src/passport.js` (all 6 strategies)
- `/api/auth/{google,github,apple,facebook,linkedin,microsoft}` + `/callback` routes
- `/api/auth/{register,login,refresh,logout,verify-email,resend-verification}` routes
- `server/src/services/token.service.js`
- Tables `refresh_tokens`, `oauth_accounts`, `email_verification_tokens`
- bcrypt password handling; `passport-*` dependencies in `server/package.json`
- The OAuth env blocks in `.env` / `.env.example`

### Local data that must NOT move into the provider as source of truth
`users.plan`, `subscriptions`, `ltd_purchases` are **business state**, written by the
Dodo Payments webhooks (see `docs/DODO_PAYMENTS_INTEGRATION.md`). Keep these local and
authoritative, keyed off our `users` row. (Optionally mirror `plan` into provider
metadata for convenience only.)

---

## 4. Concrete code changes

### 4a. `middleware/auth.js` — verify provider JWT instead of ours
Replace the HS256 verify with JWKS-based RS256 verification, then map to a local user
(JIT-provisioning on first login).

```js
// Pseudocode — Option 1
const { createRemoteJWKSet, jwtVerify } = require('jose');
const users = require('../db/users');
const config = require('../config');

const JWKS = createRemoteJWKSet(new URL(config.auth.jwksUrl)); // provider .well-known JWKS

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.auth.issuer,
      audience: config.auth.audience,
    });
    // JIT: find by external_id, else provision a local users row from claims
    req.user = await users.findOrProvisionByExternalId({
      externalId: payload.sub,
      email: payload.email,
      name: payload.name,
    });
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required.' });
  }
}
```

### 4b. `db/users.js` — add `findOrProvisionByExternalId`
New function: look up by `external_id`; if missing, fall back to email match (to adopt
the imported legacy row, see §5), set `external_id`, return. Replaces the
`findOrCreateOAuthUser` flow in `passport.js`.

### 4c. `token.service.js` — mostly deleted
No minting, no refresh cookie, no `refresh_tokens`. The provider SDK handles session and
rotation. Keep `clearRefreshCookie` only if needed during a transition window.

### 4d. Frontend
- `client/src/api/client.js`: replace the in-memory `accessToken` + `/api/auth/refresh`
  logic with the provider SDK's `getToken()` per request. The 401-retry block can go —
  the SDK refreshes silently.
- `client/src/context/AuthContext.jsx`: replace with the provider's `useUser()`/`useAuth()`.
- `client/src/pages/AuthPage.jsx`: delete the social-button array + password forms;
  render the provider's sign-in component.
- `client/src/pages/AccountPage.jsx` `SecuritySection`: replace with the provider's
  `<UserProfile/>` (Clerk) / account page, or rebuild against their API.

---

## 5. Data migration (the riskiest part)

1. **Password users → bcrypt import.** We have real bcrypt (`$2b$`) users. Both Auth0 and
   Clerk support **bulk import of bcrypt hashes** with lazy verification — users keep
   their passwords, no forced reset. **Verify hash format compatibility before cutover.**
2. **Set `external_id` on import.** Map each imported provider user back to our existing
   `users.id` by email so the FK graph (guides, plan, subscriptions) stays intact. First
   login then matches by `external_id`; the email-fallback in §4b covers the import gap.
3. **OAuth-only users** (no password) re-authenticate via the provider's matching social
   connection; adopted by email match on first login.

---

## 6. Gotchas specific to this app

1. **`users.id` is the FK linchpin** — migrate by adding `external_id`, never by
   repointing child tables.
2. **Account-linking by email.** Today `findOrCreateOAuthUser` treats same-email across
   providers as the same user. **Auth0 does not auto-link by email by default**
   (security); Clerk has its own rules. Configure linking explicitly or you'll get
   duplicate accounts per person across Google/LinkedIn/etc.
3. **Entitlements stay local.** `plan`/`ltd`/`subscriptions` remain authoritative in our
   DB, written by Dodo webhooks — do not make provider metadata the source of truth.
4. **Already stateless/Bearer** (`requireAuth` + `api/client.js`) — RS256/JWKS slots in
   cleanly; the request-path change is small.
5. **`APP_URL` / CORS / callback domains** (`config.js:26`) — the provider's allowed
   origins and redirect URLs must include both local dev and `appdev.beanstalkhome.com`.

---

## 7. Clerk vs Auth0 for this project

- **Clerk** — fastest drop-in for a React SPA + Express API. Prebuilt `<SignIn/>` /
  `<UserProfile/>` map almost 1:1 onto what we delete. Best DX; React-centric and more
  opinionated. **Recommended for current stage.**
- **Auth0** — more flexible/enterprise, provider-agnostic, strong bulk bcrypt import and
  rules engine. More config overhead. Prefer if SAML/enterprise SSO or non-React clients
  are on the horizon.

---

## 8. Suggested sequencing (parallel, low-risk)

1. Stand up the provider SDK + login on a **feature branch, alongside** existing auth
   (don't rip anything out yet).
2. Add `users.external_id` + `findOrProvisionByExternalId`; rewrite `requireAuth` to
   accept the provider JWT (accept *both* during transition if needed).
3. Bulk-import existing users (bcrypt lazy migration); set `external_id` by email.
4. Swap frontend (`AuthContext`, `api/client.js`, `AuthPage`, `AccountPage`) to the SDK.
5. Cut over; then delete `passport.js`, `token.service.js`, the retired tables/routes,
   the `passport-*` deps, and the OAuth env scaffolding.

**Highest-risk items:** password-user import (§5.1) and email-based account linking
(§6.2). The code swap itself is mechanical.
