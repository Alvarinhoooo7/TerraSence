import * as React from 'react';
import CardHeader from './CardHeader';
import styles from '../styles/TabletCards.module.css';

function CommandRow({ title, description, detail, children }) {
    return (
        <div className={styles.commandRow}>
            <h3 className={styles.commandTitle}>{title}</h3>
            <p className={styles.commandDescription}>{description}</p>
            {detail && <p className={styles.commandDetail}>{detail}</p>}
            <div className={styles.commandActions}>{children}</div>
        </div>
    );
}

export default function TabletCommands(props) {
    const personalInfo = props.personalInfo || {};

    return (
        <CardHeader
            title="Comandos"
            subtitle="Dispositivo"
            leftIcon="/images/cs-comands.svg"
            leftIconWidth={24}
            leftIconHeight={24}
            handleRefresh={props.handleRefresh}
        >
            <CommandRow
                title="Factory Reset"
                description="Permite o bloquea el reset de fábrica. Envía un push al dispositivo."
            >
                <button className={styles.enableButton} onClick={() => props.handleFactory(false)}>
                    Habilitar
                </button>
                <button className={styles.disableButton} onClick={() => props.handleFactory(true)}>
                    Deshabilitar
                </button>
            </CommandRow>

            <CommandRow
                title="USB Debugging"
                description="Permite o bloquea la depuración USB. Envía un push al dispositivo."
            >
                <button className={styles.enableButton} onClick={() => props.handleUsbDebugging(false)}>
                    Habilitar
                </button>
                <button className={styles.disableButton} onClick={() => props.handleUsbDebugging(true)}>
                    Deshabilitar
                </button>
            </CommandRow>

            <CommandRow
                title="Database Dump"
                description="Genera un dump de la base de datos y lo sube a S3."
                detail={`${personalInfo.hardwareModel}/${personalInfo.objectId}`}
            >
                <button className={styles.enableButton} onClick={props.handleDumpDatabase}>
                    Generar Dump
                </button>
            </CommandRow>
        </CardHeader>
    );
}
