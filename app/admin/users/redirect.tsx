'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UsersRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // DataGrid版にリダイレクト
    router.replace('/admin/users-grid');
  }, [router]);
  
  return null;
}