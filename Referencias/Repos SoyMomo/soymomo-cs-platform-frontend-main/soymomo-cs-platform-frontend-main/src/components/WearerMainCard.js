import * as React from 'react';
import DeviceMainCard from './DeviceMainCard';

const HARDWARE_MODEL_NAMES = {
  Soymomo_Space_v1: 'Space 1.0',
  Soymomo_Space_v2: 'Space 2.0',
  Soymomo_Space_v3: 'Space 3.0',
  Soymomo_Space_v4: 'Space 4.0',
  Soymomo_Space_Lite_v1: 'Space Lite',
};

export default function WearerMainCard(props) {
  const wearer = props.wearer || {};

  const {
    firstName = '',
    lastName = '',
    phone = '',
    imei = '',
    objectId = '',
    hardwareModel = '',
  } = wearer;

  return (
    <DeviceMainCard
      name={`${firstName} ${lastName}`}
      details={[
        phone,
        `Imei: ${imei}`,
        `Object ID: ${objectId}`,
        HARDWARE_MODEL_NAMES[hardwareModel] ?? 'Sin info del modelo',
      ]}
      deviceImage="/images/cs-defaultWatchModelShadow.svg"
      openEditModal={props.openEditModal}
    />
  );
}
