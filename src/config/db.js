const mongoose = require('mongoose');
const env = require('./env');

// ✅ Step 1: global cache use karo
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // Agar pehle se connected hai, toh wahi return karo
  if (cached.conn) {
    return cached.conn;
  }

  // Agar connection promise pehle se chal rahi hai, toh uska wait karo
  if (!cached.promise) {
    const opts = {
      // ✅ Step 2: Serverless ke liye zaroori options
      serverSelectionTimeoutMS: 5000,   // 5 sec mein timeout karo (default 30s)
      socketTimeoutMS: 45000,            // Socket timeout
      maxPoolSize: 10,                   // Ek instance mein max 10 connections
      minPoolSize: 0,                    // Idle connections band karo
      maxIdleTimeMS: 270000,             // 4.5 min baad idle close
      // ✅ Step 3: Mongoose ka apna buffering off karo (taaki error turant mile)
      bufferCommands: false,
    };

    // ✅ Step 4: Global cache mein promise store karo, aur connection banao
    cached.promise = mongoose.connect(env.MONGO_URI, opts).then((mongoose) => {
      console.log(`[mongo] Connected → ${mongoose.connection.host}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Agli baar retry karne ke liye
    console.error('[mongo] Initial connection failed:', e.message);
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;