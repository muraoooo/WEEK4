'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {}
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const AdminThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // CSR compatibility - クライアントサイドでのマウント確認
  useEffect(() => {
    setMounted(true);
    
    // ローカルストレージからダークモード設定を読み込み
    if (typeof localStorage !== 'undefined') {
      const savedMode = localStorage.getItem('admin-dark-mode');
      if (savedMode !== null) {
        setIsDarkMode(JSON.parse(savedMode));
      } else {
        // システムの設定に従う
        if (typeof window !== 'undefined' && window.matchMedia) {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setIsDarkMode(systemPrefersDark);
        }
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    // ローカルストレージに保存
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('admin-dark-mode', JSON.stringify(newMode));
    }
  };

  // ライトテーマ設定
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
      text: {
        primary: 'rgba(0, 0, 0, 0.87)',
        secondary: 'rgba(0, 0, 0, 0.6)',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            color: 'rgba(0, 0, 0, 0.87)',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#ffffff',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
  });

  // ダークテーマ設定
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#90caf9',
        light: '#e3f2fd',
        dark: '#42a5f5',
      },
      secondary: {
        main: '#f48fb1',
        light: '#fce4ec',
        dark: '#ad1457',
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      text: {
        primary: '#ffffff',
        secondary: 'rgba(255, 255, 255, 0.7)',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.3)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#1e1e1e',
            borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(144, 202, 249, 0.16)',
              '&:hover': {
                backgroundColor: 'rgba(144, 202, 249, 0.24)',
              },
            },
          },
        },
      },
    },
  });

  const theme = isDarkMode ? darkTheme : lightTheme;

  // SSRとCSRのハイドレーション問題を回避
  if (!mounted) {
    return (
      <MuiThemeProvider theme={lightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default AdminThemeProvider;