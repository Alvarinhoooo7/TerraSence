import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/** Traducción ligera y tipada para textos breves sin depender de una librería externa. */
export const useTranslation = () => {
  const language = useAppStore((state) => state.preferences.language);
  const t = useCallback(
    (spanish: string, english: string) => (language === 'en' ? english : spanish),
    [language],
  );
  return {
    language,
    locale: language === 'en' ? 'en-US' : 'es-CL',
    t,
  };
};
