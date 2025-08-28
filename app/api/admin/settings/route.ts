import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';

// GET: 全設定の取得
export async function GET(request: NextRequest) {
  try {
    // 開発環境では認証をスキップ（本番環境では適切な認証を実装すること）
    // 注: ここでは開発環境用に一時的に認証を無効化

    await connectDatabase();
    
    // SystemSettingsモデルを動的にインポート
    const { SystemSettings } = require('@/models/SystemSettings');
    
    // 全設定を取得
    const allSettings = await SystemSettings.getAllSettings();
    
    return NextResponse.json({
      success: true,
      settings: allSettings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST: テストメール送信
export async function POST(request: NextRequest) {
  try {
    // 開発環境では認証をスキップ（本番環境では適切な認証を実装すること）

    const body = await request.json();
    const { action, data } = body;

    if (action === 'test-email') {
      const { testEmail } = data;
      
      if (!testEmail) {
        return NextResponse.json(
          { error: 'Test email address is required' },
          { status: 400 }
        );
      }

      // メール設定を取得
      await connectDatabase();
      const { SystemSettings } = require('@/models/SystemSettings');
      const emailSettings = await SystemSettings.getSettings('email');
      
      // テストメール送信
      try {
        // nodemailerを動的にインポート
        const nodemailer = require('nodemailer');
        
        // 環境変数から設定を取得（優先）、なければDBの設定を使用
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_SERVER_HOST || emailSettings.settings.smtpHost || 'smtp.gmail.com',
          port: parseInt(process.env.EMAIL_SERVER_PORT || emailSettings.settings.smtpPort || '587'),
          secure: process.env.EMAIL_SERVER_SECURE === 'true' || emailSettings.settings.smtpSecure || false,
          auth: {
            user: process.env.EMAIL_SERVER_USER || emailSettings.settings.smtpUser,
            pass: process.env.EMAIL_SERVER_PASSWORD || emailSettings.settings.smtpPassword
          }
        });

        // 送信者情報も環境変数から取得
        const fromAddress = process.env.EMAIL_FROM || 
          `"${emailSettings.settings.emailFromName || 'System'}" <${emailSettings.settings.emailFrom || 'noreply@example.com'}>`;

        await transporter.sendMail({
          from: fromAddress,
          to: testEmail,
          subject: 'システム設定テストメール',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                <h2 style="color: white; margin: 0;">テストメール送信成功 ✅</h2>
              </div>
              <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #4a5568; line-height: 1.6;">
                  このメールは、<strong>Secure Session System</strong>のテスト送信機能から送信されました。
                </p>
                <p style="color: #4a5568; line-height: 1.6;">
                  メール設定が正しく構成されていることが確認できました。
                </p>
                <div style="background: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 5px 0; color: #2d3748;"><strong>送信サーバー:</strong> ${process.env.EMAIL_SERVER_HOST || emailSettings.settings.smtpHost}</p>
                  <p style="margin: 5px 0; color: #2d3748;"><strong>ポート:</strong> ${process.env.EMAIL_SERVER_PORT || emailSettings.settings.smtpPort}</p>
                  <p style="margin: 5px 0; color: #2d3748;"><strong>送信者:</strong> ${fromAddress}</p>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #718096; font-size: 12px; text-align: center;">
                  送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                </p>
              </div>
            </div>
          `
        });

        return NextResponse.json({
          success: true,
          message: 'Test email sent successfully'
        });
      } catch (emailError: any) {
        console.error('Email sending error:', emailError);
        return NextResponse.json(
          { error: 'Failed to send test email', details: emailError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in settings action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}