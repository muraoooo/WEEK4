import { CircularProgress, Box, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  fullHeight?: boolean;
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 40,
  fullHeight = false 
}: LoadingSpinnerProps) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: fullHeight ? '100vh' : '200px',
        gap: 2
      }}
    >
      <CircularProgress size={size} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}