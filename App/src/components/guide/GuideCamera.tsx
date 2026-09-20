import React, { useContext } from 'react';
import { CameraView, type CameraViewProps } from 'expo-camera';
import { GuideContext } from './GuideContext';

/** Consultar ayuda nunca envía una solicitud de acceso por un QR en la cámara. */
export function GuideCamera(props: CameraViewProps) {
  const guide = useContext(GuideContext);
  return <CameraView {...props} onBarcodeScanned={guide?.active ? undefined : props.onBarcodeScanned} />;
}
