'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Storage as StorageIcon,
  Notifications as NotificationsIcon,
  Api as ApiIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';

// 各タブコンポーネント - 動的インポート
import dynamic from 'next/dynamic';

const GeneralSettings = dynamic(() => import('@/components/admin/settings/GeneralSettings'), {
  loading: () => <CircularProgress />,
});
const SecuritySettings = dynamic(() => import('@/components/admin/settings/SecuritySettings'), {
  loading: () => <CircularProgress />,
});
const EmailSettings = dynamic(() => import('@/components/admin/settings/EmailSettings'), {
  loading: () => <CircularProgress />,
});
const StorageSettings = dynamic(() => import('@/components/admin/settings/StorageSettings'), {
  loading: () => <CircularProgress />,
});
const NotificationSettings = dynamic(() => import('@/components/admin/settings/NotificationSettings'), {
  loading: () => <CircularProgress />,
});
const ApiSettings = dynamic(() => import('@/components/admin/settings/ApiSettings'), {
  loading: () => <CircularProgress />,
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SystemSettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    general: {},
    security: {},
    email: {},
    storage: {},
    notification: {},
    api: {},
  });
  const [originalSettings, setOriginalSettings] = useState<any>({});
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 設定の読み込み
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // 注: x-admin-secretヘッダーはサーバーサイドでのみ使用すべき
      // 実際の実装では、認証済みのセッションから権限を確認する
      const response = await fetch('/api/admin/settings', { headers: { 'x-admin-secret': 'admin-development-secret-key' } });

      if (!response.ok) {
        if (response.status === 401) {
          showNotification('管理者権限が必要です', 'error');
          return;
        }
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      const settingsData = data.settings || {};
      
      // デフォルト値を設定
      const defaultSettings = {
        general: settingsData.general || {},
        security: settingsData.security || {},
        email: settingsData.email || {},
        storage: settingsData.storage || {},
        notification: settingsData.notification || {},
        api: settingsData.api || {},
      };
      
      setSettings(defaultSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotification('設定の読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingsChange = (category: string, newSettings: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [category]: newSettings,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const categories = ['general', 'security', 'email', 'storage', 'notification', 'api'];
      const category = categories[tabValue];

      const response = await fetch(`/api/admin/settings/${category}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': 'admin-development-secret-key' 
        },
        body: JSON.stringify({
          settings: settings[category],
          reason: '管理画面から設定を更新',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const data = await response.json();
      
      // 保存した設定を原本として更新
      setOriginalSettings((prev: any) => ({
        ...prev,
        [category]: JSON.parse(JSON.stringify(settings[category])),
      }));

      showNotification(`${getCategoryName(category)}の設定を保存しました`, 'success');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showNotification(error.message || '設定の保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const categories = ['general', 'security', 'email', 'storage', 'notification', 'api'];
    const category = categories[tabValue];
    
    setSettings((prev: any) => ({
      ...prev,
      [category]: JSON.parse(JSON.stringify(originalSettings[category] || {})),
    }));
    
    showNotification('設定をリセットしました', 'info');
  };

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      general: '一般設定',
      security: 'セキュリティ設定',
      email: 'メール設定',
      storage: 'ストレージ設定',
      notification: '通知設定',
      api: 'API設定',
    };
    return names[category] || category;
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const hasChanges = () => {
    const categories = ['general', 'security', 'email', 'storage', 'notification', 'api'];
    const category = categories[tabValue];
    return JSON.stringify(settings[category]) !== JSON.stringify(originalSettings[category] || {});
  };

  if (loading) {
    return (
      <Backdrop open={true} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          システム設定
        </Typography>
        <Typography variant="body1" color="text.secondary">
          システム全体の動作に関する設定を管理します。
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SettingsIcon />} label="一般設定" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="セキュリティ" iconPosition="start" />
          <Tab icon={<EmailIcon />} label="メール設定" iconPosition="start" />
          <Tab icon={<StorageIcon />} label="ストレージ" iconPosition="start" />
          <Tab icon={<NotificationsIcon />} label="通知設定" iconPosition="start" />
          <Tab icon={<ApiIcon />} label="API設定" iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <GeneralSettings
            settings={settings.general}
            onChange={(newSettings) => handleSettingsChange('general', newSettings)}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SecuritySettings
            settings={settings.security}
            onChange={(newSettings) => handleSettingsChange('security', newSettings)}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <EmailSettings
            settings={settings.email}
            onChange={(newSettings) => handleSettingsChange('email', newSettings)}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <StorageSettings
            settings={settings.storage}
            onChange={(newSettings) => handleSettingsChange('storage', newSettings)}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <NotificationSettings
            settings={settings.notification}
            onChange={(newSettings) => handleSettingsChange('notification', newSettings)}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={5}>
          <ApiSettings
            settings={settings.api}
            onChange={(newSettings) => handleSettingsChange('api', newSettings)}
          />
        </TabPanel>

        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={handleReset}
            disabled={!hasChanges() || saving}
          >
            リセット
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges() || saving}
          >
            {saving ? '保存中...' : '設定を保存'}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}