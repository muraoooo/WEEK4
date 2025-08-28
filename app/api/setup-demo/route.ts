import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDatabase();
    
    const usersCollection = mongoose.connection.collection('users');
    
    // デモアカウントが存在するか確認
    const existingUser = await usersCollection.findOne({ email: 'admin@example.com' });
    
    if (existingUser) {
      // パスワードを更新
      const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
      await usersCollection.updateOne(
        { email: 'admin@example.com' },
        { 
          $set: { 
            password: hashedPassword,
            role: 'admin',
            status: 'active',
            name: 'Demo Admin',
            updatedAt: new Date()
          }
        }
      );
      
      return NextResponse.json({
        message: 'Demo account updated successfully',
        email: 'admin@example.com',
        password: 'Admin123!@#',
        status: 'updated'
      });
    } else {
      // 新規作成
      const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
      await usersCollection.insertOne({
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Demo Admin',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        loginCount: 0,
        permissions: ['all'],
        profile: {
          avatar: null,
          bio: 'Demo administrator account',
          location: 'Tokyo, Japan'
        }
      });
      
      return NextResponse.json({
        message: 'Demo account created successfully',
        email: 'admin@example.com',
        password: 'Admin123!@#',
        status: 'created'
      });
    }
  } catch (error) {
    console.error('Setup demo error:', error);
    return NextResponse.json({
      error: 'Failed to setup demo account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}