import { supabase } from './supabase';
import { parseRecoveryTokens } from './authDeepLinkParser';
import { useAuthStore } from '../store/useAuthStore';

export { parseRecoveryTokens } from './authDeepLinkParser';

export const createRecoverySession = async (url: string): Promise<boolean> => {
  const tokens = parseRecoveryTokens(url);
  if (!tokens) return false;

  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) throw error;
  if (!data.session) throw new Error('Recovery session missing');
  useAuthStore.getState().setRecoveryUserId(data.session.user.id);
  return true;
};
