/**
 * Vercel serverless entry point.
 *
 * Vercel looks for files under /api and turns each one into its own
 * serverless function. This file simply hands the whole Express app to
 * Vercel — `app.js` never calls `.listen()`, so it works equally well here
 * (serverless, one invocation per request) and in `src/server.js` (a normal
 * long-running Node process for local dev / Docker).
 *
 * Every request is routed here by the rewrite in vercel.json, and
 * `src/app.js` connects to MongoDB (via the cached connection in
 * src/config/db.js) on the first request of every route under /api before
 * it reaches a controller.
 */
module.exports = require('../src/app');
