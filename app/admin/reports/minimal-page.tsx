'use client';

import React from 'react';

export default function MinimalReportsPage() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>通報管理</h1>
      <p>このページは正常に動作しています。</p>
      <button onClick={() => alert('クリック成功')}>
        テストボタン
      </button>
    </div>
  );
}