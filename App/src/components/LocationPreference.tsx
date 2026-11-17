import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from './AppText';
import { GuideSwitch as Switch } from './guide/GuideControls';
import { SettingsCard, SettingsText } from './SettingsUI';
import { askForAccess } from './permissionPrompt';
import { useAppTheme } from '../hooks/useAppTheme';
import { useTranslation } from '../hooks/useTranslation';
import { isLegacyAndroidBluetooth, readPermission } from '../services/permissionsService';
import { choiceAfterAsking, LOCATION_CHOICE_KEY, LOCATION_REVOKED_NOTICE_KEY, type LocationChoice } from '../utils/measureLocation';
import { PERMISSION_COPY, pick } from '../utils/permissionCopy';

/**
 * Ubicación y pronóstico: la misma elección que se responde en la entrada. Vive en Preferencias y
 * en la hoja del clima de una lectura sin ubicación, para activarla sin salir del resultado.
 */
export function LocationPreference() {
  const { colors } = useAppTheme(); const { t, language } = useTranslation();
  const [on, setOn] = useState(false); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    void Promise.all([AsyncStorage.getItem(LOCATION_CHOICE_KEY).catch(() => null), readPermission('location').catch(() => null)]).then(([stored, state]) => {
      if (!active.current) return;
      const choice: LocationChoice = stored === 'on' || stored === 'off' ? stored : null;
      const granted = state?.status === 'granted';
      // Sin elección guardada, lo que hará la lectura: capturar si ya había permiso (salvo Android antiguo).
      setOn(choice === 'on' ? granted : choice === null && granted && !isLegacyAndroidBluetooth());
      // La elección sigue activa aunque el teléfono haya retirado el permiso: se explica cómo volver.
      if (choice === 'on' && !granted) setNote(t('El teléfono retiró el permiso. Actívala para volver a darlo; TerraSense la mantiene activa.', 'The phone removed the permission. Turn it on to allow it again; TerraSense keeps it on.'));
    });
    return () => { active.current = false; };
  }, [t]);
  const change = async (value: boolean) => {
    if (busy) return;
    setNote('');
    if (!value) { setOn(false); AsyncStorage.setItem(LOCATION_CHOICE_KEY, 'off').catch(() => undefined); return; }
    setBusy(true);
    try {
      // Sin permiso se pide aquí; si el sistema ya no pregunta, ofrece abrir los ajustes.
      const access = await askForAccess('location', language, () => active.current);
      if (!active.current) return;
      setOn(access.ok);
      AsyncStorage.setItem(LOCATION_CHOICE_KEY, choiceAfterAsking(access.ok)).catch(() => undefined);
      if (access.ok) AsyncStorage.removeItem(LOCATION_REVOKED_NOTICE_KEY).catch(() => undefined);
      if (access.ok && access.state.approximate) setNote(t('Ubicación aproximada: las coordenadas serán menos precisas.', 'Approximate location: coordinates will be less precise.'));
      else if (access.deniedNow) setNote(pick(PERMISSION_COPY.location.denied, language));
    } finally { if (active.current) setBusy(false); }
  };
  return <SettingsCard>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{t('Ubicación y pronóstico', 'Location and forecast')}</Text>
        <SettingsText>{t('Guarda las coordenadas de cada lectura y consulta el pronóstico con Open-Meteo. Sin esto, la lectura se guarda igual.', 'Saves the coordinates of each reading and gets the forecast from Open-Meteo. Without it, the reading is still saved.')}</SettingsText>
      </View>
      <Switch accessibilityLabel={t('Ubicación y pronóstico', 'Location and forecast')} disabled={busy} value={on} onValueChange={value => void change(value)} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
    {!!note && <SettingsText>{note}</SettingsText>}
  </SettingsCard>;
}
