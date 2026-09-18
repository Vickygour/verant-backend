const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(env.MONGO_URI);
    isConnected = true;

    console.log(`[mongo] Connected → ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[mongo] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[mongo] Disconnected');
      isConnected = false;
    });

    return conn;
  } catch (err) {
    console.error('[mongo] Initial connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
