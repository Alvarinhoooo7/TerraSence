import * as React from 'react';
import CardHeader from './CardHeader';
import InfoRow from './InfoRow';
import formatISODate from '../utils/formater';


export default function WearerInfo(props) {
  const wearer = props.wearer || {};

  const {
    firstLinked = null,
    firstName = '',
    lastName = '',
    phone = '',
    lastKnownLocation = { latitude: '', longitude: '' },
    lastLocationTime = { iso: '' },
    lastTKQ = { iso: '' },
    batterySaveInUse = 'False',
    batteryPercentage = '',
    birthday = new Date(),
    pushy = ''
  } = wearer;

  return (
    <CardHeader
      title={props.title}
      subtitle={props.subtitle}
      leftIcon={props.leftIcon}
      leftIconWidth={props.leftIconWidth}
      leftIconHeight={props.leftIconHeight}
      handleRefresh={props.handleRefresh}
    >
      <InfoRow
        iconSrc="/images/cs-wearerInfoUser.svg"
        label="Nombre"
        value={`${firstName} ${lastName}`}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoSim.svg"
        label="Telefono"
        value={phone}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoWorld.svg"
        label="Últimas coordenadas"
        value={`(${lastKnownLocation?.latitude}, ${lastKnownLocation?.longitude})`}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoCalendar.svg"
        label="Última actualización coordenadas"
        value={formatISODate(lastLocationTime?.iso)}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoBattery.svg"
        label="Batería"
        value={batteryPercentage}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoConnection.svg"
        label="Última conexión"
        value={formatISODate(lastTKQ?.iso)}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoCalendar.svg"
        label="Primera vinculación"
        value={formatISODate(firstLinked?.iso)}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoSaveBattery.svg"
        label="Modo ahorro de batería (sin GPS)"
        value={batterySaveInUse.toString()? (
          batterySaveInUse.toString() === "false" ? "Desactivado":
            batterySaveInUse.toString() === "true" ? "Activado": "Sin Info"
        ): "Sin Info"
        }
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoCalendar.svg"
        label="Cumpleaños"
        value={birthday && birthday.iso ? new Date(birthday.iso).toLocaleDateString() : 'Sin información'}
      />
      <InfoRow
        iconSrc="/images/cs-wearerInfoDb.svg"
        label="Pushy token"
        value={!pushy ? 'No tiene pushy token' : pushy}
      />
    </CardHeader>
  );
}
