import { useCallback, useState } from 'react';
import { useAuth } from '../../authContext';
import {
    getWatchConnectivity,
    installAuthManagerApk,
    repushSpace2Credentials,
} from '../../services/wearerService';

// El backend ya distingue cada motivo de rechazo; aca solo se traducen.
const ERROR_MESSAGES = {
    already_up_to_date: 'El reloj ya está al día. Refresca para ver el estado actual.',
    watch_offline: 'El reloj no está conectado. Pídele al cliente que lo encienda.',
    no_push_token: 'El reloj no tiene token de push registrado.',
    missing_secret: 'Falta configurar el secreto en el servidor.',
    push_failed: 'Pushy rechazó el envío.',
    cloud_function_failed: 'La cloud function falló.',
    unsupported_model: 'Este modelo no tiene arreglo de conectividad disponible.',
    wrong_track: 'El modelo del reloj no corresponde a esta acción.',
    wearer_not_found: 'No se encontró el reloj.',
};

function messageFor(error) {
    const code = error?.response?.data?.code;
    return ERROR_MESSAGES[code] || `Error: ${error.message}`;
}

/**
 * Agrupa el diagnostico de conectividad y sus dos acciones, para que la card
 * quede presentacional.
 */
export default function useConnectivity(watchId, openMessageApi) {
    const { tokens } = useAuth();
    const [diagnosis, setDiagnosis] = useState(null);
    const [inProgress, setInProgress] = useState(false);

    const fetchDiagnosis = useCallback(() => {
        if (!watchId) return Promise.resolve();
        return getWatchConnectivity(watchId, tokens.AccessToken)
            .then((response) => {
                setDiagnosis(response?.data?.data ?? null);
            })
            .catch(() => setDiagnosis(null));
    }, [watchId, tokens]);

    const refresh = () => {
        openMessageApi('Loading...', 'loading');
        return fetchDiagnosis().then(() => openMessageApi('Loaded!', 'success'));
    };

    async function runAction(action) {
        if (inProgress) return;
        setInProgress(true);
        openMessageApi('Loading...', 'loading');
        try {
            await action();
            openMessageApi(
                'Comando enviado. Confirma con el cliente que el reloj reinició.',
                'success',
                6
            );
        } catch (error) {
            openMessageApi(messageFor(error), 'error');
            // Un rechazo suele significar que el estado real cambio: se refresca.
            await fetchDiagnosis();
        } finally {
            setInProgress(false);
        }
    }

    return {
        diagnosis,
        inProgress,
        fetchDiagnosis,
        refresh,
        runSpace2Repush: () =>
            runAction(() => repushSpace2Credentials(watchId, tokens.AccessToken)),
        runInstallAuthManager: () =>
            runAction(() => installAuthManagerApk(watchId, tokens.AccessToken)),
    };
}
