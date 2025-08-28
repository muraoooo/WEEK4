import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Person,
  Article,
  Report,
  Settings,
  Info,
  Warning,
  Error,
  CheckCircle,
} from '@mui/icons-material';

interface Activity {
  id: string;
  type: 'user' | 'post' | 'report' | 'system';
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'success';
}

interface ActivityFeedProps {
  activities: Activity[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'user':
        return <Person fontSize="small" />;
      case 'post':
        return <Article fontSize="small" />;
      case 'report':
        return <Report fontSize="small" />;
      case 'system':
        return <Settings fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  const getSeverityIcon = (severity: Activity['severity']) => {
    switch (severity) {
      case 'success':
        return <CheckCircle fontSize="small" />;
      case 'warning':
        return <Warning fontSize="small" />;
      case 'error':
        return <Error fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  const getSeverityColor = (severity: Activity['severity']) => {
    switch (severity) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getAvatarColor = (type: Activity['type']) => {
    switch (type) {
      case 'user':
        return 'primary.main';
      case 'post':
        return 'success.main';
      case 'report':
        return 'warning.main';
      case 'system':
        return 'info.main';
      default:
        return 'grey.500';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}日前`;
    } else if (hours > 0) {
      return `${hours}時間前`;
    } else if (minutes > 0) {
      return `${minutes}分前`;
    } else {
      return '今';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          最近のアクティビティ
        </Typography>
        <Chip
          label={`${activities.length} 件`}
          size="small"
          variant="outlined"
        />
      </Box>

      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {activities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem
              alignItems="flex-start"
              sx={{
                px: 0,
                py: 1.5,
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: getAvatarColor(activity.type),
                  mr: 2,
                }}
              >
                {getIcon(activity.type)}
              </Avatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      sx={{ 
                        fontWeight: 500,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activity.message}
                    </Typography>
                    {getSeverityIcon(activity.severity)}
                  </Box>
                }
                secondary={
                  <Box component="span" display="flex" alignItems="center" gap={1} mt={0.5}>
                    <Chip
                      label={activity.type}
                      size="small"
                      color={getSeverityColor(activity.severity)}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {formatTime(activity.timestamp)}
                    </Typography>
                  </Box>
                }
                secondaryTypographyProps={{
                  component: 'span',
                  sx: { display: 'flex' }
                }}
              />
            </ListItem>
            {index < activities.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>

      {activities.length === 0 && (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          height={200}
        >
          <Typography variant="body2" color="text.secondary">
            アクティビティがありません
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ActivityFeed;