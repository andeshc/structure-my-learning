# StructureMyLearning

AI-powered learning guide generator built as a Vite React client and Express SQLite server.

## Stack

- React with Vite and Tailwind CSS in `client/`
- Node.js and Express in `server/`
- SQLite through `better-sqlite3`
- Email/password auth plus Google and GitHub OAuth
- OpenAI `gpt-4o` for guide and lesson generation

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in secrets in `.env`.

4. Initialize the database:

   ```bash
   npm run init:db --workspace server
   ```

5. Start both apps:

   ```bash
   npm run dev
   ```

The client runs on `0.0.0.0:5173` and the server runs on `0.0.0.0:3001`.

## Required Environment Variables

```bash
PORT=3001
HOST=0.0.0.0
DATABASE_PATH=./data/StructureMyLearning.db
JWT_SECRET=replace-with-access-token-secret
JWT_REFRESH_SECRET=replace-with-refresh-token-secret
OPENAI_API_KEY=replace-with-openai-api-key
GOOGLE_CLIENT_ID=replace-with-google-client-id
GOOGLE_CLIENT_SECRET=replace-with-google-client-secret
GOOGLE_CALLBACK_URL=https://your-api-domain.com/api/auth/google/callback
GITHUB_CLIENT_ID=replace-with-github-client-id
GITHUB_CLIENT_SECRET=replace-with-github-client-secret
GITHUB_CALLBACK_URL=https://your-api-domain.com/api/auth/github/callback
CLIENT_URL=https://your-client-domain.com
CORS_ORIGINS=https://your-client-domain.com
```

For local development, use the callback URLs from `.env.example`.

## Build

```bash
npm run build
```

This builds the client into `client/dist/`.

## Production Deployment

Use a Node host that supports persistent disk for SQLite, such as a VPS, Render disk, Fly volume, Railway volume, or a similar service. Do not deploy SQLite on storage that is wiped between restarts.

### 1. Provision Runtime Infrastructure

You need two production surfaces:

- A Node.js server for the Express API.
- A static host or reverse proxy for `client/dist/`.

The API host must have a persistent volume for SQLite. Use a path such as `/var/lib/structure-my-learning/StructureMyLearning.db` or the equivalent persistent disk path from your host.

### 2. Configure Production Environment

Set these variables on the API host:

```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATABASE_PATH=/var/lib/structure-my-learning/StructureMyLearning.db
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
OPENAI_API_KEY=<production-openai-key>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_CALLBACK_URL=https://api.example.com/api/auth/google/callback
GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>
GITHUB_CALLBACK_URL=https://api.example.com/api/auth/github/callback
CLIENT_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
```

Set this variable for the client build:

```bash
VITE_API_BASE_URL=https://api.example.com/api
```

### 3. Build and Start

1. Provision a persistent directory for the database.
2. Set `DATABASE_PATH` to a file inside that persistent directory.
3. Set `NODE_ENV=production`.
4. Set every environment variable listed above with production values.
5. Build the client:

   ```bash
   npm install
   npm run build
   ```

6. Initialize the database on the server host:

   ```bash
   npm run init:db --workspace server
   ```

7. Start the API server:

   ```bash
   npm start
   ```

8. Serve `client/dist/` with a static file host or reverse proxy, and proxy API traffic to the Express server.

### 4. Reverse Proxy Example

With Nginx, serve the built client and proxy API requests:

```nginx
server {
  server_name app.example.com;
  root /var/www/structure-my-learning/client/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }
}

server {
  server_name api.example.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Terminate TLS at the proxy or platform load balancer. Refresh cookies are `Secure` in production, so HTTPS is required.

### 5. Process Management

Use a process manager supplied by your host, or run the API with `systemd` or `pm2`.

Example `pm2` command:

```bash
pm2 start "npm start" --name structure-my-learning-api
pm2 save
```

### 6. Deployment Smoke Test

After deployment:

```bash
curl https://api.example.com/api/health
```

Then verify the full browser flow:

1. Register a user.
2. Log out and log back in.
3. Create a guide.
4. Open a topic and wait for generated content.
5. Mark the topic complete.
6. Confirm dashboard progress updates.

## OAuth Deployment Notes

- Google callback URL must exactly match `GOOGLE_CALLBACK_URL`.
- GitHub callback URL must exactly match `GITHUB_CALLBACK_URL`.
- `CLIENT_URL` must be the deployed frontend origin.
- `CORS_ORIGINS` can contain a comma-separated allowlist if multiple frontend origins are needed.

## Health Check

```bash
curl https://your-api-domain.com/api/health
```

Expected response:

```json
{"status":"ok","service":"structure-my-learning"}
```
