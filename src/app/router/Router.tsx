import { useEffect } from 'react';
import { LoginPage, useSession } from '@/modules/auth';
import { GraphPage } from '@/modules/graph';
import { MainLayout } from '../layouts/MainLayout/MainLayout';
import { navigate, useHashPath } from './hashRouter';
import { PATHS } from './paths';

export function Router() {
  const path = useHashPath();
  const { data: user } = useSession();

  // Синхронизируем URL с состоянием авторизации: вход и выход сами переводят на нужную страницу
  useEffect(() => {
    if (!user && path !== PATHS.login) navigate(PATHS.login);
    if (user && path !== PATHS.graph) navigate(PATHS.graph);
  }, [user, path]);

  if (!user) return <LoginPage />;

  return (
    <MainLayout user={user}>
      <GraphPage />
    </MainLayout>
  );
}
