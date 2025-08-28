'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Paper,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import { 
  MoreVert, 
  ThumbUp, 
  Comment, 
  Share,
  ReportProblem
} from '@mui/icons-material';
import dynamic from 'next/dynamic';

// CSR専用コンポーネント
const ClientReportDialog = dynamic(
  () => import('@/components/ClientReportDialog'),
  { 
    ssr: false,
    loading: () => null
  }
);

// サンプル投稿データ
const SAMPLE_POSTS = [
  {
    id: 'post-001',
    author: 'スパムユーザー',
    avatar: '🤖',
    content: '【驚愕】今なら無料で1000万円が手に入る！！今すぐクリック→ bit.ly/spam123',
    timestamp: '5分前',
    likes: 0,
    comments: 0,
    type: 'spam'
  },
  {
    id: 'post-002',
    author: '攻撃的なユーザー',
    avatar: '😠',
    content: 'お前みたいなやつは消えろ！存在が迷惑なんだよ！',
    timestamp: '10分前',
    likes: 1,
    comments: 3,
    type: 'harassment'
  },
  {
    id: 'post-003',
    author: '通常ユーザー',
    avatar: '😊',
    content: '今日は素晴らしい天気ですね！みなさん良い一日を！',
    timestamp: '30分前',
    likes: 24,
    comments: 5,
    type: 'normal'
  },
  {
    id: 'post-004',
    author: '誤情報拡散者',
    avatar: '📰',
    content: '【緊急速報】政府が隠蔽している事実が判明！ワクチンには〇〇が含まれていた！',
    timestamp: '1時間前',
    likes: 102,
    comments: 45,
    type: 'misinformation'
  }
];

export default function DemoReportPage() {
  const [reportDialog, setReportDialog] = useState<{
    open: boolean;
    targetId: string;
    targetContent: string;
  }>({
    open: false,
    targetId: '',
    targetContent: ''
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [reportedPosts, setReportedPosts] = useState<string[]>([]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, postId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedPost(postId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPost(null);
  };

  const handleReport = (post: typeof SAMPLE_POSTS[0]) => {
    setReportDialog({
      open: true,
      targetId: post.id,
      targetContent: post.content
    });
    handleMenuClose();
  };

  const handleReportSuccess = (reportId: string) => {
    if (selectedPost) {
      setReportedPosts([...reportedPosts, selectedPost]);
    }
    console.log('Report submitted:', reportId);
  };

  const getPostColor = (type: string) => {
    switch (type) {
      case 'spam': return '#fff3e0';
      case 'harassment': return '#ffebee';
      case 'misinformation': return '#fce4ec';
      default: return '#ffffff';
    }
  };

  const getPostBadge = (type: string) => {
    switch (type) {
      case 'spam': 
        return <Chip size="small" label="スパムの可能性" color="warning" />;
      case 'harassment': 
        return <Chip size="small" label="攻撃的" color="error" />;
      case 'misinformation': 
        return <Chip size="small" label="要確認" color="info" />;
      default: 
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
        通報システムデモ
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        下記のサンプル投稿から、問題のあるコンテンツを通報してみてください。
        各投稿の右上メニュー（⋮）から通報できます。
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SAMPLE_POSTS.map((post) => (
          <Card 
            key={post.id} 
            sx={{ 
              bgcolor: getPostColor(post.type),
              opacity: reportedPosts.includes(post.id) ? 0.6 : 1,
              position: 'relative'
            }}
          >
            {reportedPosts.includes(post.id) && (
              <Paper sx={{ 
                position: 'absolute', 
                top: 10, 
                right: 10, 
                px: 2, 
                py: 0.5,
                bgcolor: 'success.main',
                color: 'white'
              }}>
                通報済み
              </Paper>
            )}
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  {post.avatar}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {post.author}
                    </Typography>
                    {getPostBadge(post.type)}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {post.timestamp}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuOpen(e, post.id)}
                  disabled={reportedPosts.includes(post.id)}
                >
                  <MoreVert />
                </IconButton>
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {post.content}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  size="small" 
                  startIcon={<ThumbUp />}
                  color="inherit"
                >
                  {post.likes}
                </Button>
                <Button 
                  size="small" 
                  startIcon={<Comment />}
                  color="inherit"
                >
                  {post.comments}
                </Button>
                <Button 
                  size="small" 
                  startIcon={<Share />}
                  color="inherit"
                >
                  シェア
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            const post = SAMPLE_POSTS.find(p => p.id === selectedPost);
            if (post) handleReport(post);
          }}
        >
          <ReportProblem fontSize="small" sx={{ mr: 1 }} />
          この投稿を通報
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          投稿を非表示
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          ユーザーをブロック
        </MenuItem>
      </Menu>

      <ClientReportDialog
        open={reportDialog.open}
        onClose={() => setReportDialog({ ...reportDialog, open: false })}
        targetId={reportDialog.targetId}
        targetType="post"
        targetContent={reportDialog.targetContent}
        onSuccess={handleReportSuccess}
      />

      <Paper sx={{ mt: 4, p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          デモ投稿の説明
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>スパム投稿</strong>：金銭的な詐欺リンクを含む → 優先度3
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>攻撃的な投稿</strong>：他者への暴言 → 優先度7
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>通常の投稿</strong>：問題のない内容
        </Typography>
        <Typography variant="body2">
          • <strong>誤情報</strong>：虚偽の情報を拡散 → 優先度5
        </Typography>
      </Paper>
    </Container>
  );
}