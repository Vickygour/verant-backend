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

// --- Routes ---
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'VÉRANT Maison API is running.' });
});

// --- 404 + error handling ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;