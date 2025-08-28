'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  ScatterChart,
  Scatter,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

interface AdvancedChartsProps {
  data: {
    userGrowth: Array<{
      date: string;
      newUsers: number;
      totalUsers: number;
      churnRate: number;
      retentionRate: number;
    }>;
    contentMetrics: Array<{
      category: string;
      posts: number;
      engagement: number;
      moderation: number;
      reports: number;
    }>;
    geographicData: Array<{
      country: string;
      users: number;
      sessions: number;
      bounceRate: number;
    }>;
    performanceMetrics: Array<{
      metric: string;
      value: number;
      target: number;
      previous: number;
    }>;
    userBehavior: Array<{
      hour: number;
      posts: number;
      views: number;
      interactions: number;
    }>;
    contentFunnel: Array<{
      stage: string;
      count: number;
      percentage: number;
    }>;
  };
}

const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ data }) => {
  const theme = useTheme();
  const [selectedChart, setSelectedChart] = useState('growth');
  const [timeRange, setTimeRange] = useState('30d');

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    theme.palette.secondary.main,
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

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 1, boxShadow: 3 }}>
          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
            <Typography variant="caption" color="text.secondary">
              {typeof label === 'string' ? label : new Date(label).toLocaleDateString('ja-JP')}
            </Typography>
            {payload.map((entry: any, index: number) => (
              <Typography
                key={index}
                variant="body2"
                sx={{ color: entry.color, fontWeight: 500 }}
              >
                {entry.name}: {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
              </Typography>
            ))}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const renderUserGrowthChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data.userGrowth}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis 
          dataKey="date" 
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
        />
        <YAxis yAxisId="users" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        <YAxis yAxisId="rate" orientation="right" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar yAxisId="users" dataKey="newUsers" fill={theme.palette.primary.main} name="新規ユーザー" />
        <Line 
          yAxisId="users" 
          type="monotone" 
          dataKey="totalUsers" 
          stroke={theme.palette.success.main} 
          strokeWidth={3}
          name="総ユーザー数"
          dot={{ fill: theme.palette.success.main, strokeWidth: 2, r: 4 }}
        />
        <Line 
          yAxisId="rate" 
          type="monotone" 
          dataKey="retentionRate" 
          stroke={theme.palette.warning.main} 
          strokeWidth={2}
          name="継続率 (%)"
          dot={{ fill: theme.palette.warning.main, strokeWidth: 2, r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderContentRadarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data.contentMetrics}>
        <PolarGrid stroke={theme.palette.divider} />
        <PolarAngleAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 'dataMax']} 
          tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
        />
        <Radar
          name="投稿数"
          dataKey="posts"
          stroke={theme.palette.primary.main}
          fill={theme.palette.primary.main}
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Radar
          name="エンゲージメント"
          dataKey="engagement"
          stroke={theme.palette.success.main}
          fill={theme.palette.success.main}
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Radar
          name="通報数"
          dataKey="reports"
          stroke={theme.palette.error.main}
          fill={theme.palette.error.main}
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );

  const renderGeographicTreemap = () => (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data.geographicData}
        dataKey="users"
        ratio={4/3}
        stroke={theme.palette.background.paper}
        fill={theme.palette.primary.main}
        content={({ root, depth, x, y, width, height, index, payload, colors, name }: any) => {
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                  fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : 'none',
                  stroke: theme.palette.background.paper,
                  strokeWidth: 2 / (depth + 1e-10),
                  strokeOpacity: 1 / (depth + 1e-10),
                }}
              />
              {depth === 1 ? (
                <text
                  x={x + width / 2}
                  y={y + height / 2}
                  textAnchor="middle"
                  fill={theme.palette.common.white}
                  fontSize={12}
                  fontWeight="600"
                >
                  {name}
                </text>
              ) : null}
              {depth === 1 ? (
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 14}
                  textAnchor="middle"
                  fill={theme.palette.common.white}
                  fontSize={10}
                >
                  {formatNumber(payload.users)}
                </text>
              ) : null}
            </g>
          );
        }}
      />
    </ResponsiveContainer>
  );

  const renderPerformanceChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart layout="horizontal" data={data.performanceMetrics}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis type="number" tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        <YAxis 
          dataKey="metric" 
          type="category" 
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          width={120}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="previous" fill={theme.palette.grey[400]} name="前期" />
        <Bar dataKey="value" fill={theme.palette.primary.main} name="現在" />
        <Bar dataKey="target" fill={theme.palette.success.main} name="目標" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderUserBehaviorHeatmap = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart data={data.userBehavior}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis 
          dataKey="hour" 
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          tickFormatter={(value) => `${value}:00`}
        />
        <YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} />
        <Tooltip 
          content={({ active, payload }: any) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <Card sx={{ p: 1, boxShadow: 3 }}>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary">
                      {data.hour}:00 - {data.hour + 1}:00
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 500 }}>
                      投稿: {data.posts}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.success.main, fontWeight: 500 }}>
                      閲覧: {formatNumber(data.views)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.warning.main, fontWeight: 500 }}>
                      インタラクション: {data.interactions}
                    </Typography>
                  </CardContent>
                </Card>
              );
            }
            return null;
          }}
        />
        <Scatter 
          dataKey="posts" 
          fill={theme.palette.primary.main}
          shape={(props: any) => {
            const { cx, cy, payload } = props;
            const radius = Math.sqrt(payload.interactions) * 0.5;
            return <circle cx={cx} cy={cy} r={radius} fill={theme.palette.primary.main} opacity={0.6} />;
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );

  const renderContentFunnelChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <FunnelChart>
        <Tooltip content={<CustomTooltip />} />
        <Funnel
          dataKey="count"
          data={data.contentFunnel}
          isAnimationActive
          fill={theme.palette.primary.main}
        >
          <LabelList position="center" fill="#fff" stroke="none" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );

  const getChartTitle = () => {
    switch (selectedChart) {
      case 'growth': return 'ユーザー成長分析';
      case 'content': return 'コンテンツカテゴリ分析';
      case 'geographic': return '地域別ユーザー分布';
      case 'performance': return 'KPIパフォーマンス';
      case 'behavior': return 'ユーザー行動パターン';
      case 'funnel': return 'コンテンツ流入ファネル';
      default: return 'データ分析';
    }
  };

  const renderSelectedChart = () => {
    switch (selectedChart) {
      case 'growth': return renderUserGrowthChart();
      case 'content': return renderContentRadarChart();
      case 'geographic': return renderGeographicTreemap();
      case 'performance': return renderPerformanceChart();
      case 'behavior': return renderUserBehaviorHeatmap();
      case 'funnel': return renderContentFunnelChart();
      default: return renderUserGrowthChart();
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {getChartTitle()}
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>期間</InputLabel>
            <Select
              value={timeRange}
              label="期間"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">過去7日間</MenuItem>
              <MenuItem value="30d">過去30日間</MenuItem>
              <MenuItem value="90d">過去90日間</MenuItem>
              <MenuItem value="1y">過去1年間</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Chart Type Selector */}
      <Box mb={3}>
        <ToggleButtonGroup
          value={selectedChart}
          exclusive
          onChange={(event, newChart) => {
            if (newChart !== null) {
              setSelectedChart(newChart);
            }
          }}
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton value="growth">
            ユーザー成長
          </ToggleButton>
          <ToggleButton value="content">
            コンテンツ分析
          </ToggleButton>
          <ToggleButton value="geographic">
            地域分布
          </ToggleButton>
          <ToggleButton value="performance">
            KPI分析
          </ToggleButton>
          <ToggleButton value="behavior">
            行動パターン
          </ToggleButton>
          <ToggleButton value="funnel">
            ファネル分析
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Chart Display */}
      <Card>
        <CardContent>
          <Box sx={{ height: 400, position: 'relative' }}>
            {renderSelectedChart()}
          </Box>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Box mt={3}>
        <Grid container spacing={2}>
          {selectedChart === 'growth' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Chip 
                  label={`平均新規ユーザー: ${Math.round(data.userGrowth.reduce((acc, item) => acc + item.newUsers, 0) / data.userGrowth.length)}`}
                  color="primary" 
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Chip 
                  label={`継続率: ${(data.userGrowth.reduce((acc, item) => acc + item.retentionRate, 0) / data.userGrowth.length).toFixed(1)}%`}
                  color="success" 
                  variant="outlined"
                />
              </Grid>
            </>
          )}
          {selectedChart === 'content' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Chip 
                  label={`最も活発: ${data.contentMetrics.reduce((prev, current) => (prev.posts > current.posts) ? prev : current).category}`}
                  color="primary" 
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Chip 
                  label={`要注意: ${data.contentMetrics.reduce((prev, current) => (prev.reports > current.reports) ? prev : current).category}`}
                  color="warning" 
                  variant="outlined"
                />
              </Grid>
            </>
          )}
          {selectedChart === 'geographic' && (
            <Grid item xs={12} sm={6} md={3}>
              <Chip 
                label={`最大市場: ${data.geographicData.reduce((prev, current) => (prev.users > current.users) ? prev : current).country}`}
                color="info" 
                variant="outlined"
              />
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default AdvancedCharts;