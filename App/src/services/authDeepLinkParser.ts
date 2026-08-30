export type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

export const parseRecoveryTokens = (url: string): RecoveryTokens | null => {
  const [, fragment = ''] = url.split('#', 2);
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#', 1)[0] : '';
  const params = new URLSearchParams(fragment || query);

  if (params.get('type') !== 'recovery') return null;

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
};
