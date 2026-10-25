/* ========================================================================
 * Мини-роутер на hash (две страницы — отдельная библиотека не нужна)
 * ===================================================================== */

import { useSyncExternalStore } from 'react';

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

const getPath = () => window.location.hash.replace(/^#/, '') || '/';

export function navigate(path: string) {
  window.location.hash = path;
}

export function useHashPath() {
  return useSyncExternalStore(subscribeToHash, getPath);
}
