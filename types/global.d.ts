// グローバル型定義
declare global {
  var mongoose: {
    conn: any;
    promise: any;
  };

  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      JWT_SECRET: string;
      JWT_ACCESS_SECRET: string;
      JWT_REFRESH_SECRET: string;
      NODE_ENV: 'development' | 'production' | 'test';
      NEXTAUTH_URL: string;
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      ADMIN_SECRET_KEY: string;
    }
  }
}

export {};