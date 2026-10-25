import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loginRequest } from '../api/loginRequest';
import { SESSION_QUERY_KEY } from '../constants';
import { readSession, writeSession } from '../model/sessionStorage';
import type { Credentials } from '../types';

// Хуки только меняют сессию. На нужную страницу переводит роутер приложения, следя за useSession.

export function useSession() {
  return useQuery<string | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: readSession,
    initialData: readSession,
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, Credentials>({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      writeSession(user);
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    writeSession(null);
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
  }, [queryClient]);
}
