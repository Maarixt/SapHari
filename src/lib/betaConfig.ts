// Beta Mode Configuration
// Set VITE_BETA_MODE=true in environment to enable beta features

export const isBetaMode = (): boolean => {
  return import.meta.env.VITE_BETA_MODE === 'true';
};

export const BETA_NOTICE_STORAGE_KEY = 'saphari-beta-notice-dismissed';

export const getBetaNoticeDismissed = (userId?: string): boolean => {
  const key = userId ? `${BETA_NOTICE_STORAGE_KEY}:${userId}` : BETA_NOTICE_STORAGE_KEY;
  return localStorage.getItem(key) === 'true';
};

export const setBetaNoticeDismissed = (userId?: string): void => {
  const key = userId ? `${BETA_NOTICE_STORAGE_KEY}:${userId}` : BETA_NOTICE_STORAGE_KEY;
  localStorage.setItem(key, 'true');
};
