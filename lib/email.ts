const nodemailer = require('nodemailer');

// メール送信用のトランスポーターを作成
export const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_SERVER_HOST || process.env.SMTP_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || process.env.SMTP_PORT || '587'),
    secure: process.env.EMAIL_SERVER_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SERVER_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD || process.env.SMTP_PASS,
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    }
  });
};

// ウェルカムメール送信
export const sendWelcomeEmail = async (
  to: string,
  name: string,
  password: string
): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Survibe" <${process.env.EMAIL_SERVER_USER}>`,
      to: to,
      subject: 'Welcome to Survibe - Your Account Has Been Created',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .credentials { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffebc8; padding: 10px; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Survibe, ${name}! 🎉</h1>
            </div>
            <div class="content">
              <p>Your account has been successfully created by an administrator.</p>
              
              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${to}</p>
                <p><strong>Temporary Password:</strong> ${password}</p>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul>
                  <li>Please change your password immediately after your first login</li>
                  <li>Enable two-factor authentication for added security</li>
                  <li>Never share your credentials with anyone</li>
                </ul>
              </div>
              
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login" class="button">
                Login to Your Account
              </a>
              
              <div class="footer">
                <p>If you didn't expect this email, please contact our support team immediately.</p>
                <p>Best regards,<br>The Survibe Team</p>
                <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Survibe, ${name}!
        
        Your account has been successfully created by an administrator.
        
        Your Login Credentials:
        Email: ${to}
        Temporary Password: ${password}
        
        Important Security Notice:
        - Please change your password immediately after your first login
        - Enable two-factor authentication for added security
        - Never share your credentials with anyone
        
        Login to your account at: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login
        
        If you didn't expect this email, please contact our support team immediately.
        
        Best regards,
        The Survibe Team
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// パスワードリセットメール送信
export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  resetLink: string
): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Survibe" <${process.env.EMAIL_SERVER_USER}>`,
      to: to,
      subject: 'Password Reset Request - Survibe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <a href="${resetLink}" class="button">Reset Password</a>
              
              <p style="margin-top: 20px; color: #666;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
              
              <p style="margin-top: 30px; color: #666;">This link will expire in 1 hour for security reasons.</p>
              
              <div class="footer">
                <p>If you didn't request this password reset, you can safely ignore this email.</p>
                <p>Best regards,<br>The Survibe Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name},
        
        We received a request to reset your password. 
        
        Reset your password here: ${resetLink}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this password reset, you can safely ignore this email.
        
        Best regards,
        The Survibe Team
      `
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

// 通報受理通知メール送信（管理者向け）
export const sendReportNotificationToAdmin = async (
  reportType: string,
  reason: string,
  reporterName: string,
  targetContent?: string
): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_SERVER_USER;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Survibe" <${process.env.EMAIL_SERVER_USER}>`,
      to: adminEmail,
      subject: `[要確認] 新しい通報が届きました - ${reportType}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert { background: #fff3cd; border: 1px solid #ffebc8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .details { background: white; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ 新しい通報が届きました</h1>
            </div>
            <div class="content">
              <div class="alert">
                <strong>優先度の高い通報の可能性があります。速やかに確認してください。</strong>
              </div>
              
              <div class="details">
                <h3>通報詳細:</h3>
                <p><strong>通報タイプ:</strong> ${reportType}</p>
                <p><strong>通報理由:</strong> ${reason}</p>
                <p><strong>通報者:</strong> ${reporterName}</p>
                ${targetContent ? `<p><strong>対象コンテンツ:</strong><br/>${targetContent.substring(0, 200)}...</p>` : ''}
              </div>
              
              <p>管理画面で詳細を確認し、適切な対応を行ってください。</p>
              
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/reports" class="button">
                管理画面で確認
              </a>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                <p>このメールは自動送信されています。</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        新しい通報が届きました
        
        通報タイプ: ${reportType}
        通報理由: ${reason}
        通報者: ${reporterName}
        ${targetContent ? `対象コンテンツ: ${targetContent.substring(0, 200)}...` : ''}
        
        管理画面で詳細を確認してください: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/reports
      `
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending report notification:', error);
    return false;
  }
};

// 通報処理完了通知メール送信（通報者向け）
export const sendReportProcessedEmail = async (
  to: string,
  name: string,
  action: 'approved' | 'rejected',
  notes?: string
): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    
    const subject = action === 'approved' 
      ? 'あなたの通報が承認されました - Survibe'
      : 'あなたの通報について - Survibe';
    
    const message = action === 'approved'
      ? 'あなたの通報を確認し、適切な措置を講じました。'
      : 'あなたの通報を慎重に検討しましたが、現時点では対応の必要はないと判断しました。';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Survibe" <${process.env.EMAIL_SERVER_USER}>`,
      to: to,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${action === 'approved' ? '#28a745' : '#6c757d'}; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .message { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${action === 'approved' ? '通報が承認されました' : '通報を確認しました'}</h1>
            </div>
            <div class="content">
              <p>${name}様</p>
              
              <div class="message">
                <p>${message}</p>
                ${notes ? `<p>管理者からのメッセージ: ${notes}</p>` : ''}
              </div>
              
              <p>今後ともSurviveをよりよいコミュニティにするためのご協力をお願いします。</p>
              
              <div class="footer">
                <p>ご不明な点がございましたら、サポートまでお問い合わせください。</p>
                <p>Survibe サポートチーム</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ${name}様
        
        ${message}
        ${notes ? `管理者からのメッセージ: ${notes}` : ''}
        
        今後ともSurviveをよりよいコミュニティにするためのご協力をお願いします。
        
        Survibe サポートチーム
      `
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending report processed email:', error);
    return false;
  }
};

// 警告メール送信（違反者向け）
export const sendWarningEmail = async (
  to: string,
  name: string,
  reason: string,
  warningCount: number
): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Survibe" <${process.env.EMAIL_SERVER_USER}>`,
      to: to,
      subject: '⚠️ コミュニティガイドライン違反に関する警告 - Survibe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ffc107; color: #333; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning-box { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .rules { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ コミュニティガイドライン違反警告</h1>
            </div>
            <div class="content">
              <p>${name}様</p>
              
              <div class="warning-box">
                <h3>警告理由: ${reason}</h3>
                <p><strong>これはあなたの${warningCount}回目の警告です。</strong></p>
                <p>あなたの行動がコミュニティガイドラインに違反していると判断されました。</p>
              </div>
              
              <div class="rules">
                <h3>今後の注意事項:</h3>
                <ul>
                  <li>コミュニティガイドラインを再度ご確認ください</li>
                  <li>他のユーザーへの敬意を持った行動を心がけてください</li>
                  <li>違反行為を繰り返した場合、アカウントが停止される可能性があります</li>
                </ul>
              </div>
              
              ${warningCount >= 3 ? '<p style="color: #dc3545; font-weight: bold;">⚠️ 次回の違反でアカウントが停止される可能性があります。</p>' : ''}
              
              <div class="footer">
                <p>この警告に異議がある場合は、サポートまでご連絡ください。</p>
                <p>Survibe 管理チーム</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ${name}様
        
        警告理由: ${reason}
        これはあなたの${warningCount}回目の警告です。
        
        あなたの行動がコミュニティガイドラインに違反していると判断されました。
        
        今後の注意事項:
        - コミュニティガイドラインを再度ご確認ください
        - 他のユーザーへの敬意を持った行動を心がけてください
        - 違反行為を繰り返した場合、アカウントが停止される可能性があります
        
        ${warningCount >= 3 ? '⚠️ 次回の違反でアカウントが停止される可能性があります。' : ''}
        
        この警告に異議がある場合は、サポートまでご連絡ください。
        
        Survibe 管理チーム
      `
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending warning email:', error);
    return false;
  }
};