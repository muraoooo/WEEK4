import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDatabase();

    const { id: sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // user_sessionsコレクションからセッションを削除
    const sessionsCollection = mongoose.connection.collection('user_sessions');
    
    // セッションを無効化（物理削除ではなく論理削除）
    const result = await sessionsCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(sessionId) },
      { 
        $set: { 
          isActive: false,
          terminatedAt: new Date(),
          terminatedBy: 'admin',
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // トークンブラックリストに追加（存在する場合）
    const blacklistCollection = mongoose.connection.collection('token_blacklist');
    const session = await sessionsCollection.findOne({ 
      _id: new mongoose.Types.ObjectId(sessionId) 
    });
    
    if (session && session.refreshToken) {
      await blacklistCollection.insertOne({
        token: session.refreshToken,
        type: 'refresh',
        reason: 'Admin terminated session',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後に自動削除
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Session termination error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate session' },
      { status: 500 }
    );
  }
}