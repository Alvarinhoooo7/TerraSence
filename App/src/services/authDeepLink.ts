import { supabase } from './supabase';
import { parseRecoveryTokens } from './authDeepLinkParser';

export { parseRecoveryTokens } from './authDeepLinkParser';

export const createRecoverySession = async (url: string): Promise<boolean> => {
  const tokens = parseRecoveryTokens(url);
  if (!tokens) return false;

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) throw error;
  return true;
};
