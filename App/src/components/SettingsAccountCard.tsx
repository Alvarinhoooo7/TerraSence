import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { AppIcon } from './AppIcon';
import { Typography } from '../constants/theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { accountInitials } from '../utils/accountInitials';

const PANEL = '#17392C';
const AVATAR = '#C6DFB4';
const AVATAR_INK = '#12281F';
const BADGE = '#24503A';

/** Portada de Configuración: iniciales, nombre, correo y estado de verificación. Panel `#17392C` en ambos temas. */
export function SettingsAccountCard() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const user = useAuthStore(s => s.session?.user);
  const [names, setNames] = useState<{ first: string; last: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase.from('profiles').select('first_name,last_name').eq('id', user.id).single()
      .then(({ data }) => { if (alive && data) setNames({ first: data.first_name ?? '', last: data.last_name ?? '' }); }, () => undefined);
    return () => { alive = false; };
  }, [user?.id]);
  if (!user) return null;
  const email = user.email ?? '';
  const fullName = [names?.first, names?.last].filter(Boolean).join(' ') || email;
  const verified = !!user.email_confirmed_at;
  return <View accessible accessibilityLabel={`${fullName}. ${email}. ${verified ? t('Correo verificado', 'Email verified') : t('Correo sin verificar', 'Email not verified')}`}
    style={{ borderRadius: 24, backgroundColor: PANEL, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
    <View accessible={false} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: AVATAR, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: AVATAR_INK, fontSize: 22, ...Typography.display.bold }}>{accountInitials(names?.first, names?.last, email)}</Text>
    </View>
    <View style={{ flex: 1, gap: 4 }}>
      <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>{fullName}</Text>
      {fullName !== email && <Text numberOfLines={1} style={{ color: '#C4D4C9', fontSize: 14 }}>{email}</Text>}
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: BADGE }}>
        <AppIcon name={verified ? 'check' : 'help'} size={12} color={verified ? '#7FD1A0' : colors.pin} />
        <Text style={{ color: '#E3F0D6', fontSize: 12, fontWeight: '600' }}>{verified ? t('Correo verificado', 'Email verified') : t('Correo sin verificar', 'Email not verified')}</Text>
      </View>
    </View>
  </View>;
}
