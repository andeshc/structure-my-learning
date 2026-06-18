# Railway Resiliency & Backups

Action plan for protecting state and improving availability of the
Structure My Learning deployment on Railway.

## Current setup (as of this writing)

- **Deploy**: single combined client + server container, built via NIXPACKS
  (`railway.json`), started with `npm start` → `server/src/index.js`. Restart
  policy `ON_FAILURE`, max 10 retries.
- **Database**: managed Railway **Postgres** via `DATABASE_URL` + the `pg`
  driver. Schema/migrations run at startup in `server/src/db/init.js`
  (idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE`).
- **Generated images**: stored as **URL strings** in the DB
  (`guides.illustration_path`, `subtopics.illustration_urls`). Bytes live in
  **Backblaze B2** when `B2_*` + `CDN_URL` are set, otherwise fall back to
  local disk `/app/server/public/generated`.
- **Health**: `GET /api/health` returns `{status:"ok"}` — does **not** query
  the DB, and is **not** referenced in `railway.json`.

### Known gaps found
- `railway.json` defines **no volume** and **no `healthcheckPath`**.
- `docker-compose.yml` is **stale** — references SQLite
  (`DATABASE_PATH=/data/...db`), not the current Postgres setup. Misleading;
  delete or update.
- Local-disk image fallback is on **ephemeral** container storage → wiped on
  every redeploy.

---

## Tier 1 — data you can't recreate (do first)

### 1. Postgres backups (crown jewels: users, guides, content, payments, progress)
- Enable **Railway's scheduled Postgres backups** in the dashboard; confirm
  retention and that they're actually running (plan-dependent — don't assume).
- Add an **independent automated `pg_dump`** to external object storage (reuse
  the existing B2 bucket). Daily `pg_dump $DATABASE_URL | gzip | upload-to-b2`
  with ~30-day retention → off-platform recovery if the Railway account/project
  is lost. Especially important for payment data.
  - Implemented as a GitHub Actions workflow:
    `.github/workflows/db-backup.yml` (runs from the `main` branch).
- **Test a restore.** An untested backup is not a backup.

#### B2 application key scope (least privilege — append-only)
- **Capability: `writeFiles` only** (B2 web UI "Write Only"). PutObject and
  multipart upload need only `writeFiles`.
  - **No `deleteFiles`** — the B2 lifecycle rule prunes; a leaked CI key then
    can't wipe existing backups.
  - **No `readFiles` / `listFiles`** — the upload never reads dumps back, so a
    leaked key can't exfiltrate the database either.
  - No bucket/key admin capabilities.
- **Restrict to the single backups bucket.** If the bucket is shared across
  apps, also restrict to name prefix `db-backups/structure-my-learning/`.
- **Never use the B2 account/master key** — create a dedicated named key.
- **Restores use a separate read-capable key**, used only during DR, never
  stored in CI. (Fallback: if an upload errors on access, add
  `listFiles`+`readFiles`; still no delete.)
- For strongest protection, put backups in a **dedicated bucket with Object
  Lock / versioning** so even a compromised key can't alter locked objects.

### 2. Generated images at risk
- With no volume in `railway.json`, the local-disk fallback
  (`/app/server/public/generated`) is **wiped on every redeploy**; the DB keeps
  URLs that then 404.
- **Ensure B2 is configured in production** (`B2_*` + `CDN_URL`) — confirm prod
  isn't silently falling back to disk. B2 is durable and is also a prerequisite
  for running >1 replica.
- Enable **B2 bucket versioning / lifecycle** so accidental delete/overwrite is
  recoverable.

### 3. Secrets backup
- Irreplaceable: `JWT_SECRET`, `JWT_REFRESH_SECRET`, API keys (OpenAI, FAL, B2,
  Dodo), OAuth client secrets, SMTP creds.
- Losing `JWT_SECRET` invalidates all sessions; losing Dodo webhook keys breaks
  payments.
- Keep an **encrypted offline copy** (password manager / vault). Railway env
  vars are not a backup of themselves.

---

## Tier 2 — availability / resiliency

### 4. Wire up the healthcheck
- Add to `railway.json`: `deploy.healthcheckPath: "/api/health"`.
- Make `/api/health` run a `SELECT 1` against the DB so Railway restarts an
  instance that's up but can't reach Postgres (currently returns `ok`
  regardless).

### 5. Statelessness for scaling
- Combined client+server container is a single point of failure. To run ≥2
  replicas (no downtime on crash/redeploy) the app must be stateless:
  - **No local-disk images** → B2 only.
  - Sessions already JWT-based ✓.
- `restartPolicy: ON_FAILURE` (10 retries) covers single-instance crash
  recovery.

### 6. Safer schema migrations
- `initDb()` runs idempotent `ALTER TABLE`s on every boot; a mid-migration
  failure can leave the schema half-applied with no rollback.
- Minimum: take a DB backup (pg_dump + manual snapshot) **immediately before**
  any schema-changing deploy.

---

## Tier 3 — operational hygiene
- **Webhook idempotency**: dedupe Dodo events by ID via the `webhook_events`
  table so retries/replays don't double-charge or double-grant. Audit this.
- **Graceful degradation**: LLM / fal.ai failures currently fail the guide with
  no fallback — surface a retry path.
- **Delete or fix the stale `docker-compose.yml`** (still SQLite).

---

## Restore & restore drill

Backups are produced by `.github/workflows/db-backup.yml` as gzipped plain-SQL
dumps at `db-backups/structure-my-learning/YYYY/MM/DD/HHMMSS.sql.gz` in B2.

Use a **read-capable** B2 key for these steps (the CI upload key is write-only
by design). Set `REGION`/`BUCKET` to match, and a recent object `KEY`.

### Restore into a target database
```bash
# Stream straight from B2 → gunzip → psql. No local file needed.
aws s3 cp "s3://$BUCKET/$KEY" - \
  --endpoint-url "https://s3.$REGION.backblazeb2.com" \
  | gunzip | psql "$TARGET_DATABASE_URL"
```
The dump is taken with `--no-owner --no-acl`, so it restores cleanly into a
fresh, empty database under whatever role `$TARGET_DATABASE_URL` uses. Restore
into an **empty** DB to avoid colliding with existing objects.

### Restore drill (do this at least once, then periodically)
Verifies the backup is actually complete and restorable — the whole point.
```bash
# 1. Spin up a throwaway Postgres (match the prod major version).
docker run -d --name restore-test -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:18

# 2. Restore the latest dump into it.
aws s3 cp "s3://$BUCKET/$KEY" - \
  --endpoint-url "https://s3.$REGION.backblazeb2.com" \
  | gunzip | psql "postgresql://postgres:test@localhost:5433/postgres"

# 3. Sanity-check that real data came back.
psql "postgresql://postgres:test@localhost:5433/postgres" -c \
  "SELECT (SELECT count(*) FROM users)         AS users,
          (SELECT count(*) FROM guides)        AS guides,
          (SELECT count(*) FROM subscriptions) AS subscriptions;"

# 4. Tear down.
docker rm -f restore-test
```
Expect non-trivial counts that roughly match production. Zero rows or missing
tables means the dump is incomplete — investigate before trusting it.

---

## Suggested first steps
1. **(small, immediate)** Add `healthcheckPath` to `railway.json` + make
   `/api/health` touch the DB.
2. **(high-leverage)** Stand up the `pg_dump` → B2 backup cron with retention,
   and run a test restore (see **Restore & restore drill** above).
3. Confirm B2 is active in prod; enable bucket versioning.
4. Back up env vars to an encrypted vault.
