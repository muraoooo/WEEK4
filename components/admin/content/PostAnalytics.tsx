'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Visibility,
  ThumbUp,
  Comment,
  Share,
  Flag,
  Person,
  Schedule,
  Analytics,
  Warning,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PostAnalyticsProps {
  postId?: string;
  data: {
    views: Array<{ date: string; count: number }>;
    engagement: Array<{ date: string; likes: number; comments: number; shares: number }>;
    categories: Array<{ name: string; count: number; percentage: number }>;
    moderation: Array<{ date: string; flagged: number; approved: number; removed: number }>;
    demographics: Array<{ age: string; count: number }>;
    performance: {
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalReports: number;
      avgEngagementRate: number;
      topPerformingHour: string;
      conversionRate: number;
    };
  };
}

const PostAnalytics: React.FC<PostAnalyticsProps> = ({ postId, data }) => {
  const theme = useTheme();

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getEngagementTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      color: change > 0 ? 'success' : change < 0 ? 'error' : 'default',
    };
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Analytics color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          コンテンツ分析
        </Typography>
        {postId && (
          <Chip 
            label={`ID: ${postId}`} 
            size="small" 
            variant="outlined" 
          />
        )}
      </Box>

      {/* Performance Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Visibility color="primary" />
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {formatNumber(data.performance.totalViews)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                総閲覧数
              </Typography>
              <LinearProgress
                variant="determinate"
                value={75}
                sx={{ mt: 1, height: 4, borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <ThumbUp color="success" />
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {formatNumber(data.performance.totalLikes)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                いいね数
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <TrendingUp fontSize="small" color="success" />
                <Typography variant="caption" color="success.main">
                  +12.5%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Comment color="info" />
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {formatNumber(data.performance.totalComments)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                コメント数
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <TrendingDown fontSize="small" color="error" />
                <Typography variant="caption" color="error.main">
                  -3.2%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Flag color="warning" />
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {data.performance.totalReports}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                通報数
              </Typography>
              {data.performance.totalReports > 5 && (
                <Box display="flex" alignItems="center" gap={1} mt={1}>
                  <Warning fontSize="small" color="warning" />
                  <Typography variant="caption" color="warning.main">
                    注意が必要
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Views Trend */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                閲覧数推移（過去30日）
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.views}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                      formatter={(value: any) => [formatNumber(value), '閲覧数']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke={theme.palette.primary.main} 
                      strokeWidth={2}
                      dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Distribution */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                カテゴリ別分布
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [formatNumber(value), '投稿数']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Engagement Metrics */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                エンゲージメント推移
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.engagement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                    />
                    <Legend />
                    <Bar dataKey="likes" stackId="a" fill={theme.palette.success.main} name="いいね" />
                    <Bar dataKey="comments" stackId="a" fill={theme.palette.info.main} name="コメント" />
                    <Bar dataKey="shares" stackId="a" fill={theme.palette.warning.main} name="シェア" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Insights */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                パフォーマンスインサイト
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Schedule fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="最高パフォーマンス時間"
                    secondary={data.performance.topPerformingHour}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="平均エンゲージメント率"
                    secondary={`${data.performance.avgEngagementRate.toFixed(2)}%`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Analytics fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="コンバージョン率"
                    secondary={`${data.performance.conversionRate.toFixed(2)}%`}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                推奨アクション
              </Typography>
              <List dense>
                {data.performance.avgEngagementRate < 2 && (
                  <ListItem>
                    <ListItemIcon>
                      <Warning fontSize="small" color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="エンゲージメント向上"
                      secondary="より魅力的なコンテンツを作成"
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                )}
                {data.performance.totalReports > 5 && (
                  <ListItem>
                    <ListItemIcon>
                      <Flag fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary="コンテンツレビュー"
                      secondary="通報数が多いため内容を確認"
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Moderation Timeline */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                モデレーション履歴
              </Typography>
              <Box height={250}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.moderation}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <RechartsTooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="flagged" 
                      stroke={theme.palette.warning.main} 
                      name="フラグ付き"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="approved" 
                      stroke={theme.palette.success.main} 
                      name="承認済み"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="removed" 
                      stroke={theme.palette.error.main} 
                      name="削除済み"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PostAnalytics;