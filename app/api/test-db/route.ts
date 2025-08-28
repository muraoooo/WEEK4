import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    
    // データベース接続
    await connectDatabase();
    
    // 接続状態を確認
    const isConnected = mongoose.connection.readyState === 1;
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    
    // コレクションの一覧を取得
    const collections = await mongoose.connection.db?.listCollections().toArray();
    const collectionNames = collections?.map(col => col.name) || [];
    
    // 各コレクションのドキュメント数を取得
    const collectionCounts: any = {};
    for (const collName of collectionNames) {
      const collection = mongoose.connection.db?.collection(collName);
      const count = await collection?.countDocuments({});
      collectionCounts[collName] = count || 0;
    }
    
    return NextResponse.json({
      status: 'success',
      isConnected,
      database: mongoose.connection.db?.databaseName,
      collections: collectionNames,
      documentCounts: collectionCounts,
      connectionState: mongoose.connection.readyState === 0 ? 'disconnected' :
                       mongoose.connection.readyState === 1 ? 'connected' :
                       mongoose.connection.readyState === 2 ? 'connecting' :
                       mongoose.connection.readyState === 3 ? 'disconnecting' :
                       'unknown'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: String(error)
    }, { status: 500 });
  }
}