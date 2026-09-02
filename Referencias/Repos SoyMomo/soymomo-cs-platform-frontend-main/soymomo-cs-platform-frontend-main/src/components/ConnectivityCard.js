import * as React from 'react';
import { useState } from 'react';
import { Modal } from 'antd';
import CardHeader from './CardHeader';
import styles from '../styles/ConnectivityCard.module.css';
import formatISODate from '../utils/formater';

const REASON_TEXT = {
    no_watch_status: 'El reloj todavía no ha reportado su estado.',
    package_not_found: 'La app no aparece en el último reporte del reloj.',
    unparsable: 'No se pudo leer el reporte del reloj.',
};

// Cada accion reinicia el reloj del cliente: el modal lo dice explicitamente.
// La version a instalar la informa el backend (targetVersionCode), para que el
// modal no pueda quedar desincronizado del APK que realmente se envia.
const MODAL_COPY = {
    space2RepushCredentials: {
        button: 'Recargar credenciales',
        title: () => 'Recargar credenciales',
        body: () =>
            'Se enviará el comando de recarga de credenciales al reloj. El reloj se reiniciará. Confirma con el cliente que reinició antes de cerrar el caso.',
    },
    installAuthManagerApk: {
        button: 'Instalar actualización',
        title: (d) => `Instalar WatchAuthManager v${d.targetVersionCode}`,
        body: (d) =>
            `Se instalará WatchAuthManager v${d.targetVersionCode} en el reloj. El reloj se reiniciará al terminar. Confirma con el cliente que reinició antes de cerrar el caso.`,
    },
};

// El bloque de Pushy solo aplica a los modelos con app de Pushy y token; el
// backend lo resuelve y lo informa.
function shouldRenderPushy(pushy) {
    if (!pushy) return false;
    return pushy.supported && pushy.hasToken;
}

// Con error no sabemos el estado real, asi que no se afirma "Offline".
function presenceLabel(pushy) {
    if (pushy.error) return 'Sin datos';
    return pushy.online ? 'Online' : 'Offline';
}

function requirementText(diagnosis) {
    const { installedVersionCode, expectedVersionCode, comparison } = diagnosis;
    const required =
        comparison === 'gte' ? `≥ ${expectedVersionCode}` : `${expectedVersionCode}`;
    return `Instalada ${installedVersionCode ?? '—'} · requerida ${required}`;
}

/**
 * Card unica de conexion del reloj: ultima conexion (B4A y Pushy) y diagnostico
 * de conectividad con su accion de arreglo.
 *
 * Los bloques de conexion se muestran siempre; la seccion de conectividad solo
 * cuando el modelo tiene un arreglo disponible.
 */
export default function ConnectivityCard(props) {
    const {
        lastTKQ,
        pushy,
        diagnosis,
        inProgress,
        onConfirm,
        onRefresh,
    } = props;
    const [isModalOpen, setIsModalOpen] = useState(false);

    const tkq = lastTKQ || { iso: '' };
    const showConnectivity = Boolean(diagnosis?.supported);
    const upToDate = diagnosis?.upToDate;
    const isOnline = pushy?.online === true;
    const canAct = showConnectivity && upToDate === false && isOnline && !inProgress;

    const handleOk = () => {
        setIsModalOpen(false);
        onConfirm();
    };

    return (
        <CardHeader
            title="Conectividad"
            subtitle="Última conexión y estado"
            handleRefresh={onRefresh}
        >
            {showConnectivity && diagnosis.action && (
                <Modal
                    title={MODAL_COPY[diagnosis.action].title(diagnosis)}
                    open={isModalOpen}
                    onOk={handleOk}
                    onCancel={() => setIsModalOpen(false)}
                    okButtonProps={{ className: styles.okBtn, disabled: inProgress }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                >
                    {MODAL_COPY[diagnosis.action].body(diagnosis)}
                </Modal>
            )}

            <div className={styles.textContainer}>
                <p className={styles.blockLabel}>B4A</p>
                <p className={styles.text}>
                    Este imei se encuentra activo hasta:{' '}
                    <span className={styles.variable}>{formatISODate(tkq?.iso)}</span>
                </p>
            </div>

            {shouldRenderPushy(pushy) && (
                <div className={`${styles.textContainer} ${styles.secondBlock}`}>
                    <div className={styles.blockStatusRow}>
                        <p className={styles.blockLabel}>Pushy</p>
                        <span className={styles.blockStatus}>
                            <span
                                className={`${styles.dot} ${pushy.online ? styles.dotOn : styles.dotOff}`}
                                title={presenceLabel(pushy)}
                                aria-label={presenceLabel(pushy)}
                            />
                            {presenceLabel(pushy)}
                        </span>
                    </div>
                    <p className={styles.text}>
                        Última activación:{' '}
                        <span className={styles.variable}>
                            {formatISODate(pushy.lastActive)}
                        </span>
                    </p>
                </div>
            )}

            {showConnectivity && (
                <div className={styles.section}>
                    {upToDate === null ? (
                        <div className={styles.statusRow}>
                            <span className={styles.status}>
                                <span
                                    className={`${styles.dot} ${styles.dotOff}`}
                                    aria-label="Sin datos"
                                />
                                Sin datos de versión
                            </span>
                        </div>
                    ) : (
                        <>
                            <div className={styles.statusRow}>
                                <span className={styles.status}>
                                    <span
                                        className={`${styles.dot} ${upToDate ? styles.dotOn : styles.dotOff}`}
                                        aria-label={upToDate ? 'Al día' : 'Desactualizado'}
                                    />
                                    {upToDate ? 'Versión al día' : 'Versión desactualizada'}
                                </span>
                                <span
                                    className={upToDate ? styles.badgeOk : styles.badgeOutdated}
                                >
                                    {upToDate ? 'OK' : 'Desactualizado'}
                                </span>
                            </div>
                            <p className={styles.detail}>{requirementText(diagnosis)}</p>
                        </>
                    )}

                    {diagnosis.reason && (
                        <p className={styles.hint}>{REASON_TEXT[diagnosis.reason]}</p>
                    )}

                    <p className={styles.muted}>
                        Último reporte: {formatISODate(diagnosis.watchStatusUpdatedAt)}
                    </p>

                    {upToDate === false && (
                        <>
                            {!isOnline && (
                                <p className={styles.hint}>
                                    Pídele al cliente que encienda o conecte el reloj, y vuelve
                                    a cargar la card con el botón ↻ antes de enviar el comando.
                                </p>
                            )}

                            <div className={styles.actionRow}>
                                <button
                                    className={styles.primaryBtn}
                                    disabled={!canAct}
                                    onClick={() => setIsModalOpen(true)}
                                    title={isOnline ? undefined : 'El reloj debe estar online'}
                                >
                                    <strong>
                                        {inProgress
                                            ? 'Procesando...'
                                            : MODAL_COPY[diagnosis.action].button}
                                    </strong>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </CardHeader>
    );
}
