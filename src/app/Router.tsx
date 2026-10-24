import { useEffect } from 'react';
import { useSession } from '@/features/auth';
import { LoginPage } from '@/pages/login';
import { MapPage } from '@/pages/map';
import { navigate, useHashPath } from '@/shared/lib';

export function Router() {
  const path = useHashPath();
  const { data: user } = useSession();

  // Синхронизируем URL с состоянием авторизации
  useEffect(() => {
    if (!user && path !== '/login') navigate('/login');
    if (user && path !== '/map') navigate('/map');
  }, [user, path]);

  return user ? <MapPage user={user} /> : <LoginPage />;
}
