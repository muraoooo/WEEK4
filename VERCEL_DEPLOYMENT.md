# Vercel Deployment Configuration

## Required Environment Variables

Vercelのダッシュボードで以下の環境変数を設定してください：

### 1. Database Configuration
```
MONGODB_URI=mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0
```

### 2. Authentication Secrets
```
JWT_SECRET=secure-jwt-secret-key-for-production
JWT_ACCESS_SECRET=access-token-secret-key-production
JWT_REFRESH_SECRET=refresh-token-secret-key-production
ADMIN_SECRET_KEY=your-secure-admin-key-for-production
```

### 3. Email Configuration
```
EMAIL_SERVER_USER=noreply@miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PASSWORD=Vhdyt4@k52uhViB
EMAIL_SERVER_HOST=miraichimoonshot.sakura.ne.jp
EMAIL_SERVER_PORT=587
EMAIL_SERVER_SECURE=false
EMAIL_FROM=Survibe <noreply@miraichimoonshot.sakura.ne.jp>
```

### 4. NextAuth Configuration
```
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key
```

## Setting Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable listed above
4. Select the appropriate environment (Production, Preview, Development)
5. Save the changes

## Important Security Notes

- **Never commit sensitive environment variables to Git**
- Use different values for production than development
- Regularly rotate secrets and API keys
- For `ADMIN_SECRET_KEY`, use a strong, unique value in production

## Deployment Commands

### Manual Deployment
```bash
vercel --prod
```

### Automatic Deployment
Vercel automatically deploys when you push to the main branch.

## Post-Deployment Checklist

- [ ] Verify MongoDB connection is working
- [ ] Test login functionality with admin credentials
- [ ] Check audit logs are being recorded
- [ ] Verify email sending (if applicable)
- [ ] Test all admin panel features
- [ ] Monitor error logs in Vercel dashboard

## Troubleshooting

### MongoDB Connection Issues
- Ensure IP whitelist in MongoDB Atlas includes Vercel's IP ranges
- Verify connection string format and credentials

### Authentication Failures
- Check JWT secrets are correctly set
- Verify ADMIN_SECRET_KEY matches between client and server

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are listed in package.json
- Verify Node.js version compatibility

## Support

For deployment issues:
1. Check Vercel build and function logs
2. Review MongoDB Atlas connection logs
3. Verify all environment variables are set correctly