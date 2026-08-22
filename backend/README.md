# VexaTrade Certificate Backend 4.0

Backend API for the VexaTrade certificate and KYC system.

## Database

This version uses **TiDB MySQL** through `mysql2`. MongoDB/Mongoose are no longer required.

### TiDB Cloud setup

Create a database in TiDB, for example:

```sql
CREATE DATABASE vexatrade;
```

Then configure the backend with either a `TIDB_URL` or the individual variables:

```env
TIDB_HOST=gateway01.<your-region>.prod.aws.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=<your-tiDB-user>
TIDB_PASSWORD=<your-password>
TIDB_DATABASE=vexatrade
TIDB_SSL=true
```

The backend automatically creates its application document table on startup. It stores the existing application models (users, applications, certificates, notifications and audit logs) in TiDB JSON documents while preserving the existing controller/API contract.

## Render

Set the backend Root Directory to `backend`, Build Command to `npm install`, and Start Command to `npm start`.

Required production variables include `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`, `TIDB_SSL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, and `CORS_ORIGIN`.

Keep credentials in Render Environment Variables; do not commit them to GitHub.

## Redis

Set `REDIS_ENABLED=false` unless a Redis service is configured. JWT refresh-token storage has an in-memory fallback when Redis is disabled.

## Health

After deployment, open `/health`. A successful response reports the TiDB-backed service as healthy.
