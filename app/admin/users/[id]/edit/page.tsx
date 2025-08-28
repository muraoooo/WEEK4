'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'banned' | 'deleted';
  bio?: string;
  profilePicture?: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'moderator' | 'user',
    bio: '',
  });

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: { 'x-admin-secret': 'admin-development-secret-key' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      setUser(data.user);
      setFormData({
        name: data.user.name || '',
        email: data.user.email,
        role: data.user.role,
        bio: data.user.bio || '',
      });
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ユーザーデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': 'admin-development-secret-key'
        },
        body: JSON.stringify({
          action: 'UPDATE_INFO',
          data: {
            name: formData.name,
            email: formData.email,
            bio: formData.bio,
          },
          adminId: 'current-admin',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      setSuccess('ユーザー情報を更新しました');
      
      // 権限が変更された場合
      if (formData.role !== user?.role) {
        const roleResponse = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': 'admin-development-secret-key'
          },
          body: JSON.stringify({
            action: 'UPDATE_ROLE',
            data: { role: formData.role },
            reason: 'Admin update',
            adminId: 'current-admin',
          }),
        });
        
        if (!roleResponse.ok) {
          throw new Error('Failed to update role');
        }
        
        setSuccess('ユーザー情報と権限を更新しました');
      }
      
      setTimeout(() => {
        router.push(`/admin/users/${userId}`);
      }, 1500);
      
    } catch (err) {
      console.error('Save error:', err);
      setError('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string) => (event: any) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">ユーザーが見つかりません</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push(`/admin/users/${userId}`)}
        >
          戻る
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          ユーザー編集
        </Typography>
        
        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Stack spacing={3}>
          <TextField
            label="名前"
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            variant="outlined"
          />
          
          <TextField
            label="メールアドレス"
            value={formData.email}
            onChange={handleChange('email')}
            fullWidth
            variant="outlined"
            type="email"
          />
          
          <FormControl fullWidth>
            <InputLabel>権限</InputLabel>
            <Select
              value={formData.role}
              onChange={handleChange('role')}
              label="権限"
            >
              <MenuItem value="user">ユーザー</MenuItem>
              <MenuItem value="moderator">モデレーター</MenuItem>
              <MenuItem value="admin">管理者</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="自己紹介"
            value={formData.bio}
            onChange={handleChange('bio')}
            fullWidth
            variant="outlined"
            multiline
            rows={4}
          />
        </Stack>

        <Box mt={4} display="flex" justifyContent="flex-end" gap={2}>
          <Button
            variant="outlined"
            onClick={() => router.push(`/admin/users/${userId}`)}
            disabled={saving}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}