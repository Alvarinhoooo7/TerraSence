import * as React from 'react';
import CardHeader from './CardHeader';
import InfoRow from './InfoRow';
import styles from '../styles/TabletCards.module.css';

const SETTINGS = [
    {
        field: 'browserAllowed',
        label: 'Navegación internet',
        iconSrc: '/images/cs-wearerInfoWorld.svg',
    },
    {
        field: 'remoteBlocked',
        label: 'Bloqueo remoto',
        iconSrc: '/images/cs-wearerInfoConnection.svg',
    },
    {
        field: 'smartDetectionEnabled',
        label: 'Algoritmo de detección',
        iconSrc: '/images/cs-wearerInfoGps.svg',
    },
    {
        field: 'profanityDetectionEnabled',
        label: 'Detección de cyberbullying',
        iconSrc: '/images/cs-wearerInfoSaveBattery.svg',
    },
];

export default function TabletSettings(props) {
    const personalInfo = props.personalInfo || {};

    return (
        <CardHeader
            title="Ajustes tablet"
            subtitle="Control parental"
            leftIcon="/images/cs-wearerSettings.svg"
            leftIconWidth={24}
            leftIconHeight={29}
            handleRefresh={props.handleRefresh}
        >
            {SETTINGS.map(({ field, label, iconSrc }) => {
                const isEnabled = Boolean(personalInfo[field]);
                return (
                    <InfoRow
                        key={field}
                        iconSrc={iconSrc}
                        label={label}
                        value={isEnabled ? 'Activado' : 'Desactivado'}
                        action={
                            <button
                                className={isEnabled ? styles.disableButton : styles.enableButton}
                                onClick={() => props.toggleParentalControl(field)}
                            >
                                {isEnabled ? 'Desactivar' : 'Activar'}
                            </button>
                        }
                    />
                );
            })}
        </CardHeader>
    );
}
