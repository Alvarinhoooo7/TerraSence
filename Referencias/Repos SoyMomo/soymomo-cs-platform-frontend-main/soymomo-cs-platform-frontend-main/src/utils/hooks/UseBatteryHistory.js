import { useState } from 'react';
import { getBatteryHistory } from '../../services/wearerService';
import { message } from 'antd';

export default function useBatteryHistory(tokens, wearer) {
    const [batteryHistory, setBatteryHistory] = useState([]);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [isBatteryHistoryLoaded, setIsBatteryHistoryLoaded] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    // Función para mostrar mensajes
    const openMessageApi = (msg, type, duration = 2) => {
        messageApi.open({
            type,
            content: msg,
            duration,
        });
    };

    // Función para obtener el historial de batería con manejo de `204 No Content`
    const fetchBatteryHistory = async () => {
        if (!wearer.deviceId) {
            openMessageApi('No se encontró un deviceId', 'error');
            return;
        }

        openMessageApi('Cargando historial de batería...', 'loading');

        try {
            const response = await getBatteryHistory(wearer.deviceId, tokens.AccessToken, fromDate, toDate);

            if (!response || response.length === 0) {
                setBatteryHistory([]); 
                setIsBatteryHistoryLoaded(true);
                openMessageApi('No se encontraron datos en el rango seleccionado.', 'warning');
                return;
            }

            setBatteryHistory(response);
            setIsBatteryHistoryLoaded(true);
            openMessageApi('Historial cargado con éxito.', 'success');
        } catch (error) {
            openMessageApi('Error al obtener el historial de batería.', 'error');
        }
    };

    // Función para restablecer los filtros sin hacer una consulta API
    const resetFilters = () => {
        setFromDate(null);
        setToDate(null);
        setBatteryHistory([]);
        setIsBatteryHistoryLoaded(false);
    };

    return {
        batteryHistory,
        fromDate,
        toDate,
        isBatteryHistoryLoaded,
        setFromDate,
        setToDate,
        fetchBatteryHistory,
        resetFilters,
        // Se expone para que el dashboard use ESTE messageApi: antd solo emite
        // toasts del api cuyo contextHolder esta montado, y este es el unico.
        messageApi,
        contextHolder
    };
}
