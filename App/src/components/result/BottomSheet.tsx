import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../AppText';
import { EntryButton } from '../entry/EntryUI';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Cifras, fuente y limitaciones de una recomendación. Cerrado por defecto: el plan se lee
 * en lenguaje simple y el respaldo técnico queda a un toque para quien quiera revisarlo.
 */
export function TechnicalDetail({ text }: { text: string }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 4 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}
      style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
        {open ? t('Ocultar detalle técnico ▴', 'Hide technical detail ▴') : t('Detalle técnico y fuente ▾', 'Technical detail and source ▾')}
      </Text>
    </Pressable>
    {open && <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>{text}</Text>}
  </View>;
}

/** Hoja inferior con el contenido completo de un elemento del resultado, sobre la pantalla. */
export function BottomSheet({ visible, onClose, eyebrow, title, children }: React.PropsWithChildren<{
  visible: boolean; onClose: () => void; eyebrow?: string; title: string;
}>) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  // La hoja se dibuja bajo la barra de navegación de Android: el cierre queda por encima de ella.
  const { bottom } = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Cerrar', 'Close')} onPress={onClose} style={{ flex: 1 }} />
      <View style={{ maxHeight: height * 0.85, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ alignSelf: 'center', width: '100%', maxWidth: 520, padding: 24, paddingBottom: 12, gap: 10 }}>
          {!!eyebrow && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>{eyebrow}</Text>}
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.3 }}>{title}</Text>
          {children}
        </ScrollView>
        <View style={{ alignSelf: 'center', width: '100%', maxWidth: 520, paddingHorizontal: 24, paddingBottom: 16 + bottom, paddingTop: 4 }}>
          <EntryButton secondary label={t('Cerrar', 'Close')} onPress={onClose} />
        </View>
      </View>
    </View>
  </Modal>;
}
