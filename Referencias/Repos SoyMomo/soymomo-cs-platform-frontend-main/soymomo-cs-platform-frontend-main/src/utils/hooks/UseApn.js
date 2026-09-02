import { useCallback, useState } from 'react';
import { useAuth } from '../../authContext';
import {
    getApnCatalog,
    getApnCountries,
    sendApn,
} from '../../services/wearerService';

// El backend ya distingue cada motivo de rechazo; aca solo se traducen.
const ERROR_MESSAGES = {
    wearer_not_found: 'No se encontró el reloj.',
    apn_not_found: 'Ese APN ya no existe. Refresca la card.',
    unsupported_model: 'Este modelo no admite cambio de APN.',
    no_device_id: 'El reloj no tiene deviceId registrado.',
    no_push_token: 'El reloj no tiene token de push registrado.',
    cloud_function_failed: 'La cloud function falló.',
    push_failed: 'Pushy rechazó el envío.',
};

function messageFor(error) {
    const code = error?.response?.data?.code;
    return ERROR_MESSAGES[code] || `Error: ${error.message}`;
}

/**
 * Paises, catalogo de APNs y envio al reloj, para que la card quede
 * presentacional.
 *
 * La lista de APNs se arma recien cuando el agente elige un pais: el catalogo
 * cubre 18 paises y mostrarlos todos juntos haria facil mandar el APN de otro
 * pais por equivocacion.
 *
 * A diferencia de useConnectivity, el envio nunca se bloquea por el estado del
 * reloj: la card muestra ultima conexion y presencia, pero decide el agente.
 */
export default function useApn(watchId, openMessageApi) {
    const { tokens } = useAuth();
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [catalog, setCatalog] = useState(null);
    // catalog queda en null tanto antes del primer GET como si el GET falla, y
    // la card lee `supported` de ahi. Sin estos dos flags los tres casos se ven
    // iguales y la card afirma "no soportado" mientras carga.
    const [catalogLoaded, setCatalogLoaded] = useState(false);
    const [catalogError, setCatalogError] = useState(false);
    const [selectedApnId, setSelectedApnId] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [inProgress, setInProgress] = useState(false);

    const fetchCountries = useCallback(() => {
        return getApnCountries(tokens.AccessToken)
            .then((response) => {
                setCountries(response?.data?.data ?? []);
            })
            .catch(() => setCountries([]));
    }, [tokens]);

    // Sin pais trae solo el track del reloj, que es lo que decide que contexto
    // muestra la card antes de elegir nada.
    const fetchCatalog = useCallback(
        (country) => {
            if (!watchId) return Promise.resolve();
            setLoadingOptions(true);
            return getApnCatalog(watchId, tokens.AccessToken, country)
                .then((response) => {
                    setCatalog(response?.data?.data ?? null);
                    setCatalogError(false);
                })
                .catch(() => {
                    setCatalog(null);
                    setCatalogError(true);
                })
                .finally(() => {
                    setLoadingOptions(false);
                    setCatalogLoaded(true);
                });
        },
        [watchId, tokens]
    );

    const load = useCallback(() => {
        return Promise.all([fetchCountries(), fetchCatalog()]);
    }, [fetchCountries, fetchCatalog]);

    const refresh = () => {
        openMessageApi('Loading...', 'loading');
        setSelectedCountry(null);
        setSelectedApnId(null);
        return load().then(() => openMessageApi('Loaded!', 'success'));
    };

    // Cambiar de pais invalida el APN elegido: si no, quedaria seleccionado uno
    // que ya no esta en la lista visible.
    function selectCountry(country) {
        setSelectedCountry(country);
        setSelectedApnId(null);
        return fetchCatalog(country);
    }

    // El reloj queda sin datos moviles unos segundos mientras aplica el APN, asi
    // que el mensaje le pide al agente confirmar con el cliente en vez de dar el
    // caso por cerrado al recibir el 200.
    async function sendSelectedApn() {
        if (inProgress || !selectedApnId) return;
        setInProgress(true);
        openMessageApi('Loading...', 'loading');
        try {
            await sendApn(watchId, selectedApnId, tokens.AccessToken);
            openMessageApi(
                'APN enviado. Confirma con el cliente que recupera datos.',
                'success',
                6
            );
        } catch (error) {
            openMessageApi(messageFor(error), 'error');
        } finally {
            setInProgress(false);
        }
    }

    return {
        countries,
        selectedCountry,
        selectCountry,
        catalog,
        catalogLoaded,
        catalogError,
        selectedApnId,
        setSelectedApnId,
        loadingOptions,
        inProgress,
        load,
        refresh,
        sendSelectedApn,
    };
}
