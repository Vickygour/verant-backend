# VÉRANT Maison — Backend API

Professional Node.js + Express + MongoDB backend for the VÉRANT e-commerce storefront.
No Docker — plain Node, runs anywhere (local machine, VPS, Render, Railway, etc.).

---

## 1. Setup

```bash
cd verant-backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `MONGO_URI` — your MongoDB connection string (local or Atlas)
- `JWT_SECRET` — any long random string
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — your email provider's SMTP
  credentials (Gmail needs an **App Password**, not your normal password —
  Google account → Security → 2-Step Verification → App Passwords)
- `CLIENT_URL` — your Next.js frontend URL (`http://localhost:3000` for dev)

## 2. Seed the database

This is the command you asked for — it takes the exact product/lookbook/craft/
testimonial data that is currently hardcoded in your frontend's
`src/data/products.js` and inserts it into MongoDB, plus creates one admin
account:

```bash
npm run seed
```

To wipe just the catalogue/content (keeps users & orders) and reseed later:

```bash
npm run seed:destroy
npm run seed
```

## 3. Run the server

```bash
npm run dev     # nodemon, auto-restarts on file changes (development)
npm start       # plain node (production)
```

Server boots on `http://localhost:5000` by default. Health check:
`GET http://localhost:5000/api/health`

---

## 3. Project structure

```
src/
  config/        env.js (reads .env), db.js (mongoose connection)
  models/        User, Product, Order, Review, Content (mongoose schemas)
  controllers/   business logic per resource
  routes/        express routers per resource, wired with validation/auth/rate-limits
  middlewares/   auth (JWT), rateLimiter, error handler, validate
  validators/    express-validator rule chains
  utils/         ApiError, ApiResponse, asyncHandler, JWT/OTP helpers, nodemailer, email templates
  seed/          data.json (extracted frontend data) + seed.js
  app.js         express app (security, CORS, body parsing, routes)
  server.js      entry point — connects DB then starts listening
```

Every controller function is wrapped in `asyncHandler`, throws `ApiError` on
failure, and returns `new ApiResponse(...).send(res)` on success — so every
single endpoint in the whole API returns the same JSON shape:

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": false, "message": "...", "errors": [ { "field": "email", "message": "..." } ] }
```

---

## 4. Authentication flow (matches your frontend's login/signup/verify UI exactly)

1. **Signup** → `POST /api/auth/signup { name, email, password }`
   Creates an *unverified* user, emails a 6-digit OTP via Nodemailer.
2. **Verify** → `POST /api/auth/verify-otp { email, otp }`
   Marks the account verified, returns a JWT — user is logged in immediately,
   same as your frontend's "verify" step auto-advancing to logged-in state.
3. **Resend OTP** → `POST /api/auth/resend-otp { email }` (rate-limited)
4. **Login** → `POST /api/auth/login { email, password }`
   **Rate-limited: 5 attempts / 10 minutes per IP** (only failed attempts
   count against the limit) — this is the specific protection you asked for.
5. **Forgot password** → `POST /api/auth/forgot-password { email }` (OTP emailed)
6. **Reset password** → `POST /api/auth/reset-password { email, otp, newPassword }`
7. **Get profile** → `GET /api/auth/me` (needs `Authorization: Bearer <token>`)

Send the JWT on every protected request:
```
Authorization: Bearer <token>
```

---

## 5. Full API reference

### Auth — `/api/auth`
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/signup` | — | rate-limited, sends OTP |
| POST | `/verify-otp` | — | activates account, returns JWT |
| POST | `/resend-otp` | — | rate-limited |
| POST | `/login` | — | **rate-limited (5/10min)** |
| POST | `/forgot-password` | — | rate-limited |
| POST | `/reset-password` | — | |
| GET | `/me` | ✅ | current user profile |

### Products — `/api/products`
| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | filters: `cats,maxPrice,sizes,colors,materials,avail,query,sort,page,limit` — mirrors your `filterProducts.js` |
| GET | `/featured` | — | bestsellers + new arrivals |
| GET | `/search?q=` | — | free-text search overlay |
| GET | `/categories` | — | distinct category list |
| GET | `/:id` | — | accepts numeric id, slug, or Mongo `_id` |
| POST | `/` | admin | create product |
| PATCH | `/:id` | admin | update product |
| DELETE | `/:id` | admin | delete product |
| GET | `/:productId/reviews` | — | list reviews |
| POST | `/:productId/reviews` | ✅ | one review per user per product |

### Orders — `/api/orders`
| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/` | ✅ | **rate-limited (20/hour)** — prices/stock re-verified server-side, never trusts client |
| GET | `/my` | ✅ | logged-in user's order history |
| GET | `/all` | admin | every order |
| GET | `/:orderId` | ✅ | owner or admin only |
| PATCH | `/:orderId/status` | admin | update status/paymentStatus |

### Wishlist — `/api/wishlist` (all routes require login)
| Method | Route | Notes |
|---|---|---|
| GET | `/` | populated product docs |
| POST | `/:productId` | toggle add/remove |

### Reviews — `/api/reviews` (mounted under products, plus these standalone actions)
| Method | Route | Auth |
|---|---|---|
| DELETE | `/api/reviews/:id`  → *(add router if needed)* | owner/admin |
| PATCH | `/api/reviews/:id/like` | — |

### Users — `/api/users` (all require login)
| Method | Route | Notes |
|---|---|---|
| PATCH | `/me` | update name/phone |
| POST | `/me/addresses` | save address |
| DELETE | `/me/addresses/:addressId` | remove address |
| GET | `/` | admin — list all users |

### Content — `/api/content` (public, seeded from your original frontend data)
| Method | Route | Returns |
|---|---|---|
| GET | `/` | everything at once |
| GET | `/looks` | lookbook grid |
| GET | `/craft` | craft/process section |
| GET | `/testimonials` | homepage testimonials |
| GET | `/categoryTiles`, `/sizeOptions`, `/colorOptions`, `/materialOptions` | filter option lists |

---

## 6. Connecting your Next.js frontend

Your frontend currently imports static data directly:
```js
import { PRODUCTS, getProduct } from '@/data/products';
```

To go dynamic, replace these with `fetch` calls to this API, e.g.:

```js
// src/lib/api.js
const API_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. http://localhost:5000/api

export async function getProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/products?${qs}`, { cache: 'no-store' });
  const json = await res.json();
  return json.data.items;
}

export async function getProduct(id) {
  const res = await fetch(`${API_URL}/products/${id}`, { cache: 'no-store' });
  const json = await res.json();
  return json.data.product;
}
```

Add `NEXT_PUBLIC_API_URL=http://localhost:5000/api` to your frontend's `.env.local`.

For the login/signup page (`src/app/(auth)/login/page.jsx`), replace the
`setTimeout(...)` mock in `handleSubmit` with real calls to
`/api/auth/signup`, `/api/auth/verify-otp`, and `/api/auth/login`, storing
the returned `token` (e.g. in a cookie or `localStorage`) and sending it as
`Authorization: Bearer <token>` on subsequent requests (cart sync, wishlist,
checkout, `orders/my`, etc.).

---

## 7. Deploying live (no Docker)

Any plain Node host works — Render, Railway, a VPS with PM2, etc.

1. Push this repo (without `.env` and `node_modules` — see `.gitignore`).
2. Set every variable from `.env.example` in your host's environment settings.
3. Set the start command to `npm start`.
4. Point MongoDB to a managed cluster (MongoDB Atlas free tier is fine to start).
5. Run `npm run seed` once against production Mongo (locally, pointing
   `MONGO_URI` at the prod database) to populate the catalogue.
6. Update your frontend's `NEXT_PUBLIC_API_URL` to the deployed backend URL,
   and `CLIENT_URL` in the backend's env to your deployed frontend URL (for CORS).

---

## 7b. Deploying to Vercel (fixes the "Task timed out after 10.00 seconds" error)

Express apps are NOT servers on Vercel — every request is its own short-lived
serverless function invocation. The `builds`/`routes` pieces below already
exist in this repo (`api/index.js` + `vercel.json`); deploying without them
is exactly what causes the 10-second timeout, because Vercel had nothing to
actually invoke and every request just hung.

1. **Import the repo in Vercel** (New Project → this repo). Vercel will
   auto-detect it as a Node project. Do not change the root directory unless
   this backend lives in a sub-folder of a monorepo — then set the Vercel
   "Root Directory" to that folder.
2. **Set every environment variable** from `.env.example` under
   *Project Settings → Environment Variables* (Production **and** Preview):
   `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`,
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
   `SMTP_FROM`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OTP_EXPIRY_MINUTES`.
   Forgetting `MONGO_URI` or `JWT_SECRET` now fails fast with a clear 500
   instead of hanging (see `src/config/env.js`).
3. **MongoDB Atlas network access** — under Atlas → Network Access, allow
   `0.0.0.0/0` (or Vercel's IP ranges). Vercel functions run on rotating IPs,
   so a locked-down IP allow-list is a very common cause of connections that
   hang until they time out.
4. **Deploy.** Vercel reads `vercel.json`, builds `api/index.js` as a
   serverless function with `@vercel/node`, and rewrites every path
   (`/api/products`, `/api/auth/login`, etc.) to it.
5. **Seed the production database once**, from your machine, pointing
   `MONGO_URI` at the same Atlas cluster: `npm run seed`.
6. **Verify** by opening `https://<your-backend>.vercel.app/api/health` —
   it should respond immediately with `{ "success": true, ... }`. If it
   still times out, check the Vercel function logs first (Project →
   Deployments → the deployment → Functions) — almost always a Mongo
   connection/IP allow-list problem, not a code problem, once
   `api/index.js`/`vercel.json` are in place.
7. Point the frontend's `NEXT_PUBLIC_API_URL` at
   `https://<your-backend>.vercel.app/api` (must include `/api`), and set
   this backend's `CLIENT_URL` to the frontend's deployed URL so CORS allows it.

**Why this fixes it, technically:** `src/server.js` (used for local dev /
Docker) calls `app.listen()`, which only makes sense for a long-running
process — Vercel never runs that file. `api/index.js` exports the same
Express `app` directly as the serverless function handler instead. And
because a serverless function has no persistent "server startup" step,
`src/app.js` now opens (or reuses, via the cache in `src/config/db.js`) the
MongoDB connection on the first `/api/*` request of every invocation, rather
than relying on a one-time boot connection that never happened.

---

## 8. Security features already wired in

- `helmet` — secure HTTP headers
- `cors` — locked to `CLIENT_URL` only
- `express-mongo-sanitize` — strips `$`/`.` operators from user input (NoSQL injection)
- `xss-clean` — strips malicious HTML/script from input
- `hpp` — HTTP parameter pollution protection
- `express-rate-limit` — global + **login-specific** + OTP + order limiters
- `bcryptjs` — password hashing (10 salt rounds)
- JWT auth with short, minimal payloads
- Server-side price/stock re-verification on every order (client is never trusted)
- Passwords/OTPs excluded from queries by default (`select: false`) and stripped
  via `toSafeObject()` before ever leaving the API

---

Admin login created by the seed script: check `ADMIN_EMAIL` / `ADMIN_PASSWORD`
in your `.env` (defaults to `admin@verant-maison.in` / `Admin@12345` —
**change this immediately**).
