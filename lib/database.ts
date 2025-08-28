/**
 * MongoDB database connection
 * Handles connection pooling and reconnection
 */

import mongoose from 'mongoose';

// MongoDB URI を環境変数から構築（Vercel @ 問題の回避）
function getMongoDBUri() {
  // 方法1: 通常のMONGODB_URI（URLエンコード版）
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  
  // 方法2: 分割した環境変数から構築
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  const database = process.env.MONGODB_DATABASE;
  
  if (user && password && host && database) {
    return `mongodb+srv://${user}:${password}@${host}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
  }
  
  // 方法3: Base64エンコード版
  if (process.env.MONGODB_URI_BASE64) {
    return Buffer.from(process.env.MONGODB_URI_BASE64, 'base64').toString('utf-8');
  }
  
  throw new Error('Please define MongoDB connection environment variables (MONGODB_URI or MONGODB_USER/PASSWORD/HOST/DATABASE)');
}

const MONGODB_URI = getMongoDBUri();

interface CachedMongoose {
  conn: any;
  promise: any;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
declare global {
  var mongoose: CachedMongoose | undefined;
}

let cached: CachedMongoose = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
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
      compressors: ['zlib' as const], // データ圧縮を有効化
      readPreference: 'primaryPreferred' as const, // 読み取りパフォーマンス向上
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