import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

// POST: ウェルカムメールの送信
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, userId } = body;

    // 実際のメール送信
    const emailSent = await sendWelcomeEmail(email, name, password);
    
    // メール送信履歴を記録（監査ログ）
    await connectDatabase();
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'WELCOME_EMAIL_SENT',
      adminId: 'system',
      targetUserId: userId,
      targetUserEmail: email,
      details: {
        emailType: 'welcome',
        sentTo: email,
        userName: name,
        emailSent: emailSent,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send welcome email', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
      emailSentTo: email,
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email', details: error },
      { status: 500 }
    );
  }
}