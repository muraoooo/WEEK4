import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

// POST: メールアドレスの重複チェック
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    await connectDatabase();
    const usersCollection = mongoose.connection.collection('users');
    
    // メールアドレスを小文字に変換して検索
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await usersCollection.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    });
    
    if (existingUser) {
      return NextResponse.json({
        exists: true,
        message: 'このメールアドレスは既に使用されています',
      });
    }
    
    return NextResponse.json({
      exists: false,
      message: 'このメールアドレスは使用可能です',
    });
  } catch (error) {
    console.error('Email check error:', error);
    return NextResponse.json(
      { error: 'Failed to check email' },
      { status: 500 }
    );
  }
}