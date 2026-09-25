const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xssClean = require('xss-clean');

const env = require('./config/env');
const connectDB = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');

const app = express();

// Trust the first proxy hop
app.set('trust proxy', 1);

// --- Security headers ---
app.use(helmet());

// --- CORS: Allow ALL origins (Dev / Temporary setup) ---
app.use(
  cors({
    origin: true, // Kisi bhi origin ko allow karega (credentials/cookies ke saath bhi kaam karega)
    credentials: true,
  }),
);

// --- Body parsing ---
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// --- Sanitization against NoSQL injection & HTTP param pollution ---
app.use(mongoSanitize());
app.use(hpp());
app.use(xssClean());

// --- Perf ---
app.use(compression());

// --- Logging ---
if (!env.isProd) app.use(morgan('dev'));

// --- Rate limiting for all /api routes ---
app.use('/api', apiLimiter);

// --- Ensure a MongoDB connection before touching any /api route ---
// Locally, server.js already connects once at boot, so this resolves from
// the cache instantly. On Vercel (serverless), there is no long-running
// boot step — each cold invocation gets its DB connection here instead,
// and warm invocations reuse the cached connection from config/db.js.
// This is what actually fixes the "Task timed out after 10.00 seconds"
// error: without it, a cold function had no connection at all and every
// query hung until Vercel killed the invocation.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('[mongo] Could not connect:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database is temporarily unavailable. Please try again shortly.',
    });
  }
});

// --- Routes ---
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'VÉRANT Maison API is running.' });
});

// --- 404 + error handling ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;