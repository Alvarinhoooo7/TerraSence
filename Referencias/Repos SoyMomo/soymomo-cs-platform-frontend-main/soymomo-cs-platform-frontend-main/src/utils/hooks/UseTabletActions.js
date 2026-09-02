import { message } from 'antd';
import { useAuth } from '../../authContext';
import {
    updateTablet,
    updateParentalControlSettings,
    enableFactory,
    enableUsbDebugging,
    dumpDatabase,
} from '../../services/tabletService';

const key = 'updatable';

/**
 * Agrupa las acciones sobre una tablet (editar datos, toggles de control
 * parental y comandos de dispositivo) para que las cards queden presentacionales.
 */
export default function useTabletActions({ hid, tablet, setTablet }) {
    const { tokens } = useAuth();
    const [messageApi, contextHolder] = message.useMessage();

    function notifyLoading() {
        messageApi.open({ key, type: 'loading', content: 'Loading...' });
    }

    function notifySuccess() {
        messageApi.open({ key, type: 'success', content: 'Loaded!', duration: 2 });
    }

    function notifyError(content) {
        messageApi.open({ key, type: 'error', content, duration: 2 });
    }

    async function updateTabletField(fields) {
        notifyLoading();
        try {
            const response = await updateTablet({
                hid,
                profileName: null,
                recoveryEmail: null,
                pin: null,
                ...fields,
                token: tokens.AccessToken,
            });
            if (response) {
                setTablet(response);
                notifySuccess();
            } else {
                notifyError('Error updating tablet!');
            }
        } catch (error) {
            notifyError('Error updating tablet!');
        }
    }

    async function toggleParentalControl(setting) {
        notifyLoading();
        try {
            const parentalControlSettings = { [setting]: !tablet[setting] };
            const response = await updateParentalControlSettings({
                hid,
                parentalControlSettings,
                token: tokens.AccessToken,
            });
            if (response) {
                setTablet(response);
                notifySuccess();
            } else {
                notifyError('Error updating tablet!');
            }
        } catch (error) {
            notifyError('Error updating tablet!');
        }
    }

    async function runDeviceCommand(command) {
        notifyLoading();
        try {
            const response = await command();
            if (response.status === 200) {
                notifySuccess();
            } else {
                notifyError('Error sending command to tablet!');
            }
        } catch (error) {
            notifyError('Error sending request!');
        }
    }

    return {
        messageApi,
        contextHolder,
        updateTabletField,
        toggleParentalControl,
        handleFactory: (enable) =>
            runDeviceCommand(() => enableFactory(tablet.objectId, enable, tokens.AccessToken)),
        handleUsbDebugging: (enable) =>
            runDeviceCommand(() => enableUsbDebugging(tablet.objectId, enable, tokens.AccessToken)),
        handleDumpDatabase: () =>
            runDeviceCommand(() => dumpDatabase(tablet.objectId, tokens.AccessToken)),
    };
}
