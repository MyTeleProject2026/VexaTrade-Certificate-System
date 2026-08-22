# VexaTrade Certificate Backend — Final

This project implements the backend architecture from the supplied VexaTrade certificate specification.

## Features

- Express API
- MongoDB/Mongoose data layer
- JWT access and refresh tokens
- Optional VexaAccount SSO verification
- User, application, KYC, certificate, notification and audit models
- Admin review workflow
- KYC multipart uploads
- SVG/PNG/PDF certificate generation
- QR verification codes
- Optional blockchain anchoring adapter
- Redis-backed refresh-token storage when enabled
- Email notification adapter
- Socket.IO notifications
- Rate limiting, Helmet, CORS and request IDs
- Docker and PM2 configuration

## Setup

1. Copy `.env.example` to `.env`.
2. Set a strong `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SESSION_SECRET`.
3. Configure `MONGODB_URI`.
4. Start Redis if `REDIS_ENABLED=true`.
5. Install dependencies: `npm install`
6. Check structure: `npm run check`
7. Start development: `npm run dev`

## API

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/sso`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/applications`
- `GET /api/applications`
- `GET /api/admin/dashboard`
- `GET /api/admin/applications`
- `POST /api/admin/applications/:id/approve`
- `POST /api/admin/applications/:id/reject`
- `GET /api/certificates`
- `GET /api/certificates/verify/:code`
- `GET /api/notifications`

## Important

The external VexaAccount SSO endpoint and blockchain API are configurable adapters. They are intentionally disabled by default. Real credentials, endpoint contracts, blockchain transaction semantics, SMTP settings and deployment secrets must be supplied before production use.

KYC and identity files are sensitive and should not be exposed publicly in a production deployment. Prefer private object storage or an authenticated download service instead of public `/uploads` access.

## Security

Do not commit `.env`, passwords, API keys, signing secrets, KYC files, or production certificates to Git.
