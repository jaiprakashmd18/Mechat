# MeCHAT

A production-ready private messaging platform built with Next.js 15, Node.js, Socket.IO, Prisma, and PostgreSQL.

## Features

- **Real-time 1:1 and group messaging** via Socket.IO with delivered/seen receipts
- **Typing indicators** and live presence (online/away/busy/offline)
- **Emoji reactions** on messages with live broadcast
- **File & media attachments** (image, video, audio, document)
- **JWT authentication** with refresh tokens, Argon2 password hashing, optional 2FA/TOTP
- **End-to-end style encryption** (AES-256-GCM field encryption at rest, RSA key exchange)
- **PWA** — installable, offline fallback, push notification handler
- **Glassmorphism dark/light UI** with mobile-responsive split-pane layout
- **Admin panel stub** and full Prisma schema (calls, polls, scheduled messages modelled)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js, Express, Socket.IO, TypeScript |
| Database | PostgreSQL 16 via Prisma ORM |
| Cache / PubSub | Redis 7 (Socket.IO adapter + rate limiting) |
| Auth | JWT + Argon2 + TOTP (optional 2FA) |
| Storage | Local disk (configurable S3/MinIO) |
| Reverse proxy | Nginx with TLS termination |
| Container | Docker + Docker Compose |
| CI | GitHub Actions |

## Project Structure

```
mechat/
├── apps/
│   ├── server/          # Express + Socket.IO API
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── sockets/
│   │   │   └── validators/
│   │   └── prisma/
│   └── web/             # Next.js 15 App Router
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   ├── store/
│       │   └── types/
│       └── public/      # PWA assets, icons, sw.js
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Quick Start (local development)

### Prerequisites

- Node.js 22+
- PostgreSQL 16
- Redis 7

### 1. Clone and install

```bash
git clone https://github.com/jaiprakashmd18/mechat.git
cd mechat
npm install
```

### 2. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
# Edit both files with your values
```

Key variables in `apps/server/.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Min 32-char random secret |
| `JWT_REFRESH_SECRET` | Min 32-char random secret |
| `FIELD_ENCRYPTION_KEY` | 64-char hex key for AES-256 |

### 3. Set up the database

```bash
npx prisma migrate deploy --prefix apps/server
# or in dev:
cd apps/server && npx prisma migrate dev
```

### 4. Start services

```bash
# Backend (port 4000)
npm run dev --workspace=apps/server

# Frontend (port 3000)
npm run dev --workspace=apps/web
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Compose (production-like)

```bash
# Copy and fill env files
cp apps/server/.env.example apps/server/.env
# Edit DATABASE_URL, REDIS_URL, JWT secrets, etc.

# Place TLS certificates
mkdir -p nginx/certs
# nginx/certs/fullchain.pem
# nginx/certs/privkey.pem

docker compose up -d
```

The stack exposes:

| Service | Port |
|---|---|
| Nginx (HTTP → HTTPS) | 80, 443 |
| Next.js web | 3000 (internal) |
| Express API | 4000 (internal) |

## API overview

Base URL: `/api`

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/2fa/*` |
| Users | `GET /users/me`, `PATCH /users/me`, `GET /users/search` |
| Chats | `GET /chats`, `POST /chats/direct`, `POST /chats/group`, `GET /chats/:id` |
| Messages | `GET /messages/:chatId`, `POST /messages`, `PATCH /messages/:id`, `DELETE /messages/:id` |
| Media | `POST /media/upload` |
| Calls | `POST /calls` (stub) |
| Admin | `GET /admin/stats` (stub) |

Full Swagger docs available at `/api/docs` when running the server.

## Socket.IO events

### Client → Server

| Event | Payload |
|---|---|
| `chat:join` | `chatId` |
| `chat:leave` | `chatId` |
| `typing:start` | `chatId` |
| `typing:stop` | `chatId` |
| `message:delivered` | `{ messageId, chatId }` |
| `message:seen` | `{ messageId, chatId }` |

### Server → Client

| Event | Payload |
|---|---|
| `message:new` | `Message` |
| `message:edited` | `Message` |
| `message:deleted` | `{ id, chatId }` |
| `message:reaction` | `{ messageId, userId, emoji, action }` |
| `message:delivered` | `{ messageId, userId }` |
| `message:seen` | `{ messageId?, chatId?, userId }` |
| `presence:update` | `{ userId, status, lastSeenAt }` |
| `typing:start` | `{ chatId, userId }` |
| `typing:stop` | `{ chatId, userId }` |
| `chat:new` | `{ chatId }` |

## License

MIT
