import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from '../AppText';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { measure } from '../guide/GuideContext';
import type { AppLanguage } from '../../types/preferences';

const LANGUAGE_NAME: Record<AppLanguage, string> = { es: 'Español', en: 'English' };
const PANEL_WIDTH = 150;
const SCREEN_MARGIN = 16;

/**
 * Alterna entre los dos idiomas de la app sin abrir una pantalla aparte. El
 * gatillo muestra el idioma activo (ES/EN); el panel ofrece solo el otro,
 * porque con dos idiomas esa es la única elección que tiene sentido mostrar.
 *
 * El gatillo puede caer cerca del borde izquierdo (welcome) o del derecho
 * (login): el panel se ancla a `anchor.x` pero siempre se acota al ancho de
 * pantalla, nunca a la posición cruda del gatillo.
 */
export function LanguageSwitch({ language, onChange, busy = false }: {
  language: AppLanguage; onChange: (language: AppLanguage) => void; busy?: boolean;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: SCREEN_MARGIN, y: 80 });
  const trigger = useRef<View>(null);
  const other: AppLanguage = language === 'es' ? 'en' : 'es';
  const close = () => setOpen(false);
  const openMenu = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    void measure(trigger.current).then(rect => { if (rect) setAnchor({ x: rect.x, y: rect.y + rect.height + 6 }); });
    setOpen(true);
  };
  const left = Math.min(Math.max(anchor.x, SCREEN_MARGIN), screenWidth - PANEL_WIDTH - SCREEN_MARGIN);
  const choose = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    close();
    onChange(other);
  };
  return <>
    <View ref={trigger} collapsable={false}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Cambiar idioma', 'Change language')}
        accessibilityState={{ expanded: open, disabled: busy }} disabled={busy} onPress={openMenu}
        style={{ minHeight: 48, justifyContent: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>{language.toUpperCase()} {open ? '▴' : '▾'}</Text>
      </Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable accessibilityLabel={t('Cerrar', 'Close')} style={{ flex: 1 }} onPress={close}>
        <View style={{ position: 'absolute', top: anchor.y, left, minWidth: PANEL_WIDTH, borderRadius: 14, borderWidth: 1,
          borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 4,
          shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
          <Pressable accessibilityRole="menuitem" accessibilityLabel={LANGUAGE_NAME[other]} disabled={busy} onPress={choose}
            style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{LANGUAGE_NAME[other]}</Text>
            {busy && <ActivityIndicator size="small" color={colors.primary} />}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  </>;
}
