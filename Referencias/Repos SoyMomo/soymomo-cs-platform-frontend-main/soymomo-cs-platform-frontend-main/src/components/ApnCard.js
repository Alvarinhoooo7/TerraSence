import * as React from 'react';
import { useState } from 'react';
import { Modal, Select } from 'antd';
import CardHeader from './CardHeader';
import styles from '../styles/ApnCard.module.css';
import formatISODate from '../utils/formater';
import countryName from '../utils/countries';

// Sobre este tiempo sin reportar, el reloj 3G probablemente no reciba el
// comando ahora: queda encolado hasta que vuelva a conectarse.
const RECENT_TKQ_MS = 10 * 60 * 1000;

function isRecent(iso) {
    if (!iso) return false;
    const last = new Date(iso).getTime();
    if (Number.isNaN(last)) return false;
    return Date.now() - last < RECENT_TKQ_MS;
}

/**
 * Mensaje unico de la card cuando todavia no hay catalogo usable. Se separa del
 * render para no leer "no soportado" durante la carga ni ante un GET caido.
 */
const STATUS_MESSAGE = {
    loading: 'Cargando el catálogo de APN...',
    error: 'No se pudo cargar el catálogo de APN. Refresca la card.',
    unsupported: 'Este modelo no admite cambio de APN.',
};

function cardStatus(catalogLoaded, catalogError, supported) {
    if (catalogError) return 'error';
    if (!catalogLoaded) return 'loading';
    return supported ? 'ready' : 'unsupported';
}

/**
 * Card de APN: elegir pais, elegir un perfil del catalogo y mandarselo al reloj.
 *
 * El track lo decide el backend a partir del modelo, y determina por donde
 * viaja el comando y que tiene que verificar el agente antes de enviarlo. El
 * estado de conexion (B4A y Pushy) NO se repite aca: lo muestra la card de
 * Conectividad, que va justo arriba.
 */
export default function ApnCard(props) {
    const {
        countries,
        selectedCountry,
        onSelectCountry,
        catalog,
        catalogLoaded,
        catalogError,
        lastTKQ,
        selectedApnId,
        onSelect,
        loadingOptions,
        inProgress,
        onSend,
        onRefresh,
    } = props;
    const [isModalOpen, setIsModalOpen] = useState(false);

    const options = catalog?.options ?? [];
    const supported = Boolean(catalog?.supported);
    const status = cardStatus(catalogLoaded, catalogError, supported);
    const track = catalog?.track;
    const tkqIso = lastTKQ?.iso;
    const selected = options.find((option) => option.objectId === selectedApnId);

    // El backend los ordena por codigo; para el agente importa el nombre.
    const countryOptions = (countries ?? [])
        .map((entry) => ({
            value: entry.country,
            label: `${countryName(entry.country)} (${entry.count})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const handleOk = () => {
        setIsModalOpen(false);
        onSend();
    };

    return (
        <CardHeader dark title="APN" subtitle="Red móvil" handleRefresh={onRefresh}>
            <Modal
                title="Enviar APN al reloj"
                open={isModalOpen}
                onOk={handleOk}
                onCancel={() => setIsModalOpen(false)}
                okButtonProps={{ className: styles.okBtn, disabled: inProgress }}
                cancelButtonProps={{ className: styles.cancelBtn }}
            >
                {selected
                    ? `Se enviará "${selected.name}" (${selected.apn}). El reloj puede quedar unos segundos sin datos.`
                    : 'Selecciona un APN antes de enviar.'}
            </Modal>

            {status !== 'ready' ? (
                <p className={status === 'error' ? styles.warning : styles.hint}>
                    {STATUS_MESSAGE[status]}
                </p>
            ) : (
                <>
                    {track === 'protocol' ? (
                        <>
                            {!isRecent(tkqIso) && (
                                <p className={styles.warning}>
                                    Sin reportar desde {formatISODate(tkqIso)}. El comando queda
                                    encolado.
                                </p>
                            )}
                            <p className={styles.hint}>
                                Hazlo sonar desde Comandos y confirma con el cliente antes de
                                enviar.
                            </p>
                        </>
                    ) : (
                        <p className={styles.hint}>
                            Revisa en Conectividad que Pushy esté online. Si no, llegará cuando
                            el reloj despierte.
                        </p>
                    )}

                    <div className={styles.selectRow}>
                        <Select
                            className={styles.select}
                            placeholder="1. País"
                            value={selectedCountry || undefined}
                            onChange={onSelectCountry}
                            showSearch
                            optionFilterProp="label"
                            style={{ flex: 1, textAlign: 'left', minWidth: 200 }}
                            options={countryOptions}
                        />
                    </div>

                    <div className={styles.selectRow}>
                        <Select
                            className={styles.select}
                            placeholder={
                                selectedCountry ? '2. APN' : 'Elige un país'
                            }
                            value={selectedApnId || undefined}
                            onChange={onSelect}
                            disabled={!selectedCountry || loadingOptions}
                            loading={loadingOptions}
                            style={{ flex: 1, textAlign: 'left', minWidth: 200 }}
                            options={options.map((option) => ({
                                value: option.objectId,
                                label: `${option.carrier} — ${option.name}`,
                            }))}
                        />
                    </div>

                    {selected && (
                        <p className={styles.detail}>
                            {selected.apn}
                            {selected.simScope === 'SOYMOMO' ? ' · SIM SoyMomo' : ' · SIM externa'}
                        </p>
                    )}

                    <div className={styles.actionRow}>
                        <button
                            className={styles.primaryBtn}
                            disabled={!selectedApnId || inProgress}
                            onClick={() => setIsModalOpen(true)}
                        >
                            <strong>{inProgress ? 'Procesando...' : 'Enviar APN'}</strong>
                        </button>
                    </div>

                    <p className={styles.muted}>
                        {selectedCountry
                            ? `${options.length} APN en ${countryName(selectedCountry)}`
                            : `${countries.length} países disponibles`}
                    </p>
                </>
            )}
        </CardHeader>
    );
}
