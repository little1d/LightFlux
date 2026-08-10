# LightFlux Auth API

Node.js authentication service for WeChat website and native app login.
It uses only Node built-ins and keeps `AppSecret` values on the server.

## Setup

```bash
cp .env.example .env
npm run dev
```

`SESSION_SECRET` must contain at least 32 random characters. The service
starts without WeChat credentials so `/health` can be used during setup, but
authorization endpoints return `503` until the relevant application is
configured.

For local image-paste development without WeChat authentication, set
`UPLOAD_ALLOW_ANONYMOUS=true`. Keep it disabled in any shared or production
environment. Uploaded files are written beneath `UPLOAD_DIR`.

The text Agent uses an OpenAI-compatible chat-completions endpoint. Configure
`AI_BASE_URL` at the API root before `/chat/completions`, plus `AI_API_KEY` and
`AI_MODEL`. For example, DeepSeek uses `https://api.deepseek.com`, while OpenAI
typically uses a base ending in `/v1`. Anonymous Agent access is disabled by
default because every request consumes paid model quota;
`AI_ALLOW_ANONYMOUS=true` is only intended for isolated local development.
Provider requests time out after `AI_REQUEST_TIMEOUT_MS` (30 seconds by
default). `AI_RATE_LIMIT_MAX_REQUESTS` limits each authenticated user or
anonymous IP within `AI_RATE_LIMIT_WINDOW_MS`.

## WeChat applications

- Web: approved Website Application, callback domain and
  `WECHAT_WEB_REDIRECT_URI`.
- iOS/Android: approved Mobile Application, iOS Universal Link, Android
  package name and release signing fingerprint.
- `AppSecret` values belong only in `server/.env`, never in Expo public
  environment variables.

## Endpoints

- `GET /health`
- `GET /api/auth/wechat/web/start`
- `GET /api/auth/wechat/web/callback`
- `GET /api/auth/wechat/mobile/state`
- `POST /api/auth/wechat/mobile/exchange`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/app-state`
- `PUT /api/app-state`
- `POST /api/uploads`
- `GET /uploads/:filename`
- `POST /api/ai/turns`
- `POST /api/ai/proposals/:id/result`

The first successful WeChat authorization creates a user automatically.
When WeChat returns a `UnionID`, identities from the website and mobile
applications are linked to the same user.

Task state is stored per authenticated user through `/api/app-state`; users
on the same device never share the same task collection. Without
`EXPO_PUBLIC_AUTH_API_URL`, the client keeps using its existing device-local
storage.

The included JSON repository is suitable for local development and a
single-process deployment. Replace it with a transactional database before
running multiple API instances.

The included upload repository is also for local development. The client
stores only the returned image URL, so `/api/uploads` can later be replaced
with an object-storage adapter without migrating rich-text documents.

The Agent service only interprets text and returns validated proposals. It
never mutates app state on the server. Confirmed proposals execute through the
client command layer, then the client reports operation IDs and revisions back
to the Agent conversation.
