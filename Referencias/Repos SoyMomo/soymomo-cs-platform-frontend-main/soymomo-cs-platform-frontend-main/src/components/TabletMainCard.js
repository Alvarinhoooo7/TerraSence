import * as React from 'react';
import DeviceMainCard from './DeviceMainCard';

export default function TabletMainCard(props) {
  const tablet = props.tablet || {};

  const {
    profileName = '',
    hid = '',
    objectId = '',
    hardwareModel = '',
    versionName = '',
  } = tablet;

  return (
    <DeviceMainCard
      name={profileName || 'Sin nombre de perfil'}
      details={[
        hardwareModel || 'Sin info del modelo',
        `HID: ${hid || 'Sin info'}`,
        `Object ID: ${objectId || 'Sin info'}`,
        `Versión software: ${versionName || 'Sin info'}`,
      ]}
      deviceImage="/images/cs-tabletIconWhite.svg"
      deviceImageHeight={110}
      openEditModal={props.openEditModal}
    />
  );
}
