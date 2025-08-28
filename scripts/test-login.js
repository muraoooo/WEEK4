const fetch = require('node-fetch');

async function testLogin() {
  const url = 'http://localhost:3000/api/auth/login';
  
  const testData = {
    email: 'admin@example.com',
    password: 'Admin123!@#'
  };
  
  console.log('ログインAPIテスト開始...');
  console.log('URL:', url);
  console.log('テストデータ:', testData);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    console.log('\nレスポンスステータス:', response.status);
    console.log('レスポンスヘッダー:', response.headers.raw());
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('レスポンスデータ:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('レスポンステキスト:', responseText);
    }
    
    if (response.ok && responseData && responseData.success) {
      console.log('\n✅ ログイン成功！');
      console.log('ユーザー情報:', responseData.user);
    } else {
      console.log('\n❌ ログイン失敗');
      if (responseData && responseData.error) {
        console.log('エラーメッセージ:', responseData.error);
      }
    }
    
  } catch (error) {
    console.error('\n❌ APIリクエストエラー:', error.message);
    console.log('開発サーバーが起動しているか確認してください。');
  }
}

testLogin();