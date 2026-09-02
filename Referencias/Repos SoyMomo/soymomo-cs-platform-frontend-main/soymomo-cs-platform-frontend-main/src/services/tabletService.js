import axios from 'axios';

// El backend espera 'recoveryEmail'; 'email' se ignora y responde 400.
const TABLET_LOOKUP_PARAMS = { hid: 'hid', objectId: 'objectId', email: 'recoveryEmail' };

export const getTablet = async (identifier, token, type = 'hid') => {
    const params = { [TABLET_LOOKUP_PARAMS[type] || type]: identifier };
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/tablet/getTabletByHidOrRecoveryEmail', { params, headers: { Authorization: `Bearer ${token}` } });
    if (!response) return;
    if (!response.data) return;
    if (!response.data.data) return;
    const tab = response.data.data;
    return tab;
}

export const pushCommand = async (objectId, command, params, token) => {
    const data = {
        objectId,
        command,
        ...params
    };
    const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/tablet/pushCommand', data, { headers: { Authorization: `Bearer ${token}` } });
    return response;
}

export const enableFactory = async (objectId, enable, token) => {
    return pushCommand(objectId, 'MANAGE_FACTORY_RESET', { factoryReset: enable }, token);
}

export const enableUsbDebugging = async (objectId, enable, token) => {
    return pushCommand(objectId, 'MANAGE_USB_DEBUGGING', { usbDebugging: enable }, token);
}

export const dumpDatabase = async (objectId, token) => {
    return pushCommand(objectId, 'DUMP_DATABASE', { }, token);
}

export const getInstalledApps = async (objectId, token) => {
    const params = { objectId };
    if (!objectId) return;
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/tablet/getTabletInstalledApps', { params, headers: { Authorization: `Bearer ${token}` } });
    if (!response) return;
    if (!response.data) return;
    if (!response.data.data) return;
    const apps = response.data.data.map(app => {
        return {
            key: app.objectId,
            appName: app.appName,
            installed: Boolean(app.installed),
            allowed: Boolean(app.allowed)
        }
    });
    return apps;
}

export const getTabletUsers = async (hid, token) => {
    const params = { hid };
    if (!hid) return;
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/tablet/tabletUser/getTabletUserByHidOrRecoveryEmail', { params, headers: { Authorization: `Bearer ${token}` } });
    if (!response) return;
    if (!response.data) return;
    const data = response.data.data;
    if (!data) return;
    const users = data.map(e => {
        const user = e.user;
        return {
            key: user.objectId,
            name: user.firstName + ' ' + user.lastName,
            email: user.email,
            bd: user.createdAt !== null ? 'Si' : 'No',
            tos: user.acceptedNewTOS ? 'Si' : 'No',
            deletion: user.hasRequestedDeletion ? 'Si' : 'No'
        }
    });
    return users
}

export const getDugHistory = async (dugFromDate, dugToDate, hid, token) => {
    let from = dugFromDate ? new Date(dugFromDate) : null;
    let to = dugToDate ? new Date(dugToDate) : null;
    from = from ? from.toISOString() : null;
    to = to ? to.toISOString() : null;
    const params = { hid, from, to };
    const result = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/tablet/smartDetection/getDugHistory', { params, headers: { Authorization: `Bearer ${token}` } })
    if (!result) return;
    if (!result.data) return;
    const data = result.data.data;
    if (!data) return;
    const dugHistory = data.map((e, index) => {
        const date = new Date(e.createdAt);
        const time = date.getHours() + ':' + date.getMinutes();
        const dateStr = date.toLocaleDateString();
        return {
            id: index,
            key: index,
            image: e.screenshot.url,
            date: dateStr,
            category: e.classType,
            app: e.appName,
            time: time
        }
    });
    return dugHistory
}

export const updateTablet = async ({ hid, profileName, recoveryEmail, pin, token}) => {
    const body = { profileName, recoveryEmail, pin, hid };
    const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/tablet/updateTabletUserInformation', body, { headers: { Authorization: `Bearer ${token}` } });
    if (!response) return;
    if (!response.data) return;
    return response.data.data;
}

export const updateParentalControlSettings = async ({ hid, parentalControlSettings, token }) => {
    const body = { hid, ...parentalControlSettings };
    const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/tablet/updateParentalControlSettings', body, { headers: { Authorization: `Bearer ${token}` } });
    if (!response) return;
    if (!response.data) return;
    return response.data.data;
}  

export const getBatteryHistory = async (hid, token) => {
    let from = new Date(); 
    from.setDate(from.getDate() - 7); 
    from = from.toISOString();
    let to = new Date();
    to = to.toISOString();
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/tablet/batteryInfo/getBatteryHistory', { params: { hid, from, to }, headers: { Authorization: `Bearer ${token}` } });
    if (!response) return;
    if (!response.data) return;
    const data = response.data.data;
    if (!data) return;
    const batteryHistory = data.map((e, index) => {
        return {
            key: index,
            createdAt: e.createdAtOnTablet.iso,
            battery: e.percentage
        }
    });
    return batteryHistory;
}
// La tablet y su suscripcion se vinculan por imei. Devuelve [] (204) cuando la
// tablet no tiene SIM asociada.
export const getTabletSimInfoByImei = async (imei, token) => {
    if (!imei) return [];
    const response = await axios.get(
        process.env.REACT_APP_BACKEND_HOST + '/tabletSim/tabletSimInfo',
        { params: { imei }, headers: { Authorization: `Bearer ${token}` } }
    );
    return response?.data?.data?.results ?? [];
}
