'use client';

import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';

export default function TestMUIPage() {
  const [ready, setReady] = React.useState(false);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div>Loading MUI components...</div>;
  }

  return (
    <Container>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          通報管理（MUIテスト版）
        </Typography>
        
        <Typography variant="body1" paragraph>
          MUIコンポーネントが正常に動作しています。
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => setCount(count + 1)}
        >
          クリック回数: {count}
        </Button>
      </Box>
    </Container>
  );
}