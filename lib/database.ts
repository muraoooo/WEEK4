/**
 * MongoDB database connection
 * Handles connection pooling and reconnection
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
declare global {
  var mongoose: {
    conn: any;
    promise: any;
  };
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 20, // 接続プール数を倍増
      minPoolSize: 5, // 最小接続数を維持
      serverSelectionTimeoutMS: 5000, // より高速なタイムアウト
      socketTimeoutMS: 30000, // ソケットタイムアウトを短縮
      connectTimeoutMS: 10000, // 接続タイムアウトを追加
      family: 4, // Force IPv4
      compressors: ['zlib'], // データ圧縮を有効化
      readPreference: 'primaryPreferred', // 読み取りパフォーマンス向上
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('Connected to MongoDB');
      return mongoose;
    }).catch((error) => {
      console.error('MongoDB connection error:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDatabase;