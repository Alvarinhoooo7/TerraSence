import React from 'react';
import { BrandLoading } from './LoadingScreen';
import { useTranslation } from '../hooks/useTranslation';

/** Conexión y lectura de la sonda: la pantalla de carga de la marca, con Cancelar. */
export function MeasurementLoading({ reading, deviceName, onCancel }: { reading: boolean; deviceName: string; onCancel: () => void }) {
  const { t } = useTranslation();
  return <BrandLoading onCancel={onCancel}
    title={reading ? t('Leyendo el suelo', 'Reading the soil') : t('Conectando con la sonda', 'Connecting to the probe')}
    detail={`${deviceName} · ${reading ? t('Mantén la sonda enterrada y quieta.', 'Keep the probe in the soil and still.') : t('Mantenla encendida y cerca del teléfono.', 'Keep it on and near the phone.')}`} />;
}
