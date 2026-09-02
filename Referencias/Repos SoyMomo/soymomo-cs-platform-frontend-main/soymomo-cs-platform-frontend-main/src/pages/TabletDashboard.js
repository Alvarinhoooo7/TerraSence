import MainLayout from '../layouts/layout';
import React, { useCallback, useEffect, useState } from 'react'
import { Row, Space, Col, Input, Button } from 'antd'
import { userColumns } from '../components/tables/tabletColumns';
import TableComponent from '../components/tables/table'
import useQuery from '../utils/hooks/UseQuery';
import useTabletActions from '../utils/hooks/UseTabletActions';
import TabletMainCard from '../components/TabletMainCard';
import TabletInfo from '../components/TabletInfo';
import TabletSettings from '../components/TabletSettings';
import TabletCommands from '../components/TabletCommands';
import TabletDugHistory from '../components/TabletDugHistory';
import TabletBatteryHistory from '../components/TabletBatteryHistory';
import TabletAppsCard from '../components/TabletAppsCard';
import DeviceSIMCard from '../components/DeviceSIMCard';
import { useNavigate } from 'react-router-dom';
import { getTablet, getInstalledApps, getTabletUsers, getDugHistory, getBatteryHistory, getTabletSimInfoByImei } from '../services/tabletService.js';
import { useAuth, checkAuth } from "../authContext";

const { Search } = Input;

export default function TabletDashboard() {
    const { tokens } = useAuth();
    const [aplicationsData, setAplicationsData] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [dugHistory, setDugHistory] = useState([]);
    const [dugFromDate, setDugFromDate] = useState(null);
    const [dugToDate, setDugToDate] = useState(null);
    const key = 'updatable';
    const [inputValue, setInputValue] = useState('');
    const [batteryHistory, setBatteryHistory] = useState([]);
    const [simData, setSimData] = useState(null);

    let query = useQuery();
    const [tablet, setTablet] = useState({});
    const navigate = useNavigate();

    // El hook expone el unico messageApi/contextHolder de la pantalla: montar dos
    // contextHolders de antd como hermanos colisiona en la key "message-holder".
    const {
        messageApi,
        contextHolder,
        updateTabletField,
        toggleParentalControl,
        handleFactory,
        handleUsbDebugging,
        handleDumpDatabase,
    } = useTabletActions({ hid: tablet.hid, tablet, setTablet });

    useEffect(() => {
        if (!tokens || !checkAuth(tokens)) {
            navigate('/login');
        }
    }, [tokens, navigate]);

    useEffect(() => {
        const hid = query.get('hid');
        const objectId = query.get('objectId');
        if (!hid && !objectId) {
            navigate('/404');
            return
        } else {
            const identifier = hid || objectId;
            getTablet(identifier, tokens.AccessToken, hid ? 'hid' : 'objectId').then((tablet) => {
                if (!tablet) navigate('/404');
                setTablet(tablet);
            }).catch(() => {
                navigate('/404');
            });
        }
    }, [query, navigate, tokens])

    useEffect(() => {
        if (tablet) {
            getTabletUsers(tablet.hid, tokens.AccessToken).then((users) => {
                setUsersData(users);
            }).catch(console.error);

            getInstalledApps(tablet.objectId, tokens.AccessToken).then((apps) => {
                setAplicationsData(apps);
            }).catch(console.error);
        }
    }, [tablet, tokens])

    useEffect(() => {
        if (tablet) {
            if (dugFromDate !== null && dugToDate !== null) {
                getDugHistory(dugFromDate, dugToDate, tablet.hid, tokens.AccessToken).then((dugHistory) => {
                    setDugHistory(dugHistory);
                }).catch(console.error);
            }
        }
    }, [dugFromDate, dugToDate, tablet, messageApi, tokens])

    useEffect(() => {
        if (tablet && tablet.hid) {
            getBatteryHistory(tablet.hid, tokens.AccessToken).then((batteryHistory) => {
                setBatteryHistory(batteryHistory);
            }).catch(() => {
                messageApi.open({
                    key,
                    type: 'error',
                    content: 'Error fetching battery history!',
                    duration: 2,
                });
            });
        }
    }, [tablet, messageApi, tokens])

    // La suscripcion de tablet trae el mismo shape que la del reloj
    const mapSubToSimCard = (sub) => ({
        iccId: sub.sim?.iccId || sub.iccId,
        plan: sub.plan,
        providerName: sub.sim?.mnoProvider?.name,
        phone: sub.msisdn,
        state: sub.status,
        networkProvider: sub.sim?.networkOperator?.name,
    });

    const fetchTabletSim = useCallback(() => {
        if (!tablet.imei) {
            setSimData(null);
            return Promise.resolve();
        }
        return getTabletSimInfoByImei(tablet.imei, tokens.AccessToken)
            .then((results) => {
                // El backend ordena por updatedAt desc: la primera es la vigente
                setSimData(results.length > 0 ? mapSubToSimCard(results[0]) : null);
            })
            .catch(() => setSimData(null));
    }, [tablet.imei, tokens]);

    // SimDashboard resuelve la instancia de Parse segun state.deviceType
    const navSimDashboard = () => {
        navigate(`/sim/dashboard?imei=${tablet.imei}`, {
            state: { imei: tablet.imei, deviceType: 'tablet' },
        });
    };

    useEffect(() => {
        fetchTabletSim();
    }, [fetchTabletSim]);

    const handleRefreshSim = () => {
        messageApi.open({ key, type: 'loading', content: 'Loading...' });
        fetchTabletSim().then(() => {
            messageApi.open({ key, type: 'success', content: 'Loaded!', duration: 2 });
        });
    };

    async function onSearch(value) {
        if (value === '') return;

        // HID format: alphanumeric string + underscore + numbers
        // e.g. 7c3ffdc8666469ff_1735053599059
        const isHid = /^[a-f0-9]+_\d+$/.test(value);

        // ObjectId format: 10 character alphanumeric string
        // e.g. pQkZAEw7Md
        const isObjectId = /^[a-zA-Z0-9]{10}$/.test(value);

        // Email format
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        if (!isHid && !isObjectId && !isEmail) {
            messageApi.open({
                key,
                type: 'error',
                content: 'Invalid format. Please enter a valid HID, ObjectId or Email',
                duration: 2,
            });
            return;
        }

        messageApi.open({
            key,
            type: 'loading',
            content: `Searching by ${isHid ? 'HID' : isObjectId ? 'ObjectId' : 'Email'}...`,
        });

        try {
            const type = isHid ? 'hid' : isObjectId ? 'objectId' : 'email';
            const response = await getTablet(value, tokens.AccessToken, type);
            if (!response) {
                messageApi.open({
                    key,
                    type: 'error',
                    content: 'Not found!',
                    duration: 2,
                });
                setInputValue('');
            } else {
                messageApi.open({
                    key,
                    type: 'success',
                    content: 'Loaded!',
                    duration: 2,
                });
                setInputValue('');
                navigate(`/tablet/dashboard?hid=${response.hid}&objectId=${response.objectId}`);
            }
        } catch(error) {
            messageApi.open({
                key,
                type: 'error',
                content: 'Not found!',
                duration: 2,
            });
            setInputValue('');
        }
    }

    const handleRefreshTablet = () => {
        messageApi.open({
            key,
            type: 'loading',
            content: 'Loading...',
        });
        getTablet(tablet.hid, tokens.AccessToken, 'hid').then((tablet) => {
            messageApi.open({
                key,
                type: 'success',
                content: 'Loaded!',
                duration: 2,
            });
            setTablet(tablet);
        }).catch(() => {
            messageApi.open({
                key,
                type: 'error',
                content: 'Error fetching tablet!',
                duration: 2,
            });
        });
    }

    const handleRefreshApps = () => {
        messageApi.open({
            key,
            type: 'loading',
            content: 'Loading...',
        });
        getInstalledApps(tablet.objectId, tokens.AccessToken).then((apps) => {
            messageApi.open({
                key,
                type: 'success',
                content: 'Loaded!',
                duration: 2,
            });
            setAplicationsData(apps);
        }).catch(() => {
            messageApi.open({
                key,
                type: 'error',
                content: 'Error fetching apps!',
                duration: 2,
            });
        });
    }

    const handleRefreshTabletUsers = () => {
        messageApi.open({
            key,
            type: 'loading',
            content: 'Loading...',
        });
        getTabletUsers(tablet.hid, tokens.AccessToken).then((users) => {
            messageApi.open({
                key,
                type: 'success',
                content: 'Loaded!',
                duration: 2,
            });
            setUsersData(users);
        }).catch(() => {
            messageApi.open({
                key,
                type: 'error',
                content: 'Error fetching tablet users!',
                duration: 2,
            });
        });
    }

    const handleRefreshDugHistory = () => {
        messageApi.open({
            key,
            type: 'loading',
            content: 'Loading...',
        });
        if (dugFromDate === null || dugToDate === null) {
            messageApi.open({
                key,
                type: 'error',
                content: 'Please select a date range!',
                duration: 2,
            });
            return;
        }
        getDugHistory(dugFromDate, dugToDate, tablet.hid, tokens.AccessToken).then((dugHistory) => {
            messageApi.open({
                key,
                type: 'success',
                content: 'Loaded!',
                duration: 2,
            });
            setDugHistory(dugHistory);
        }).catch(() => {
            messageApi.open({
                key,
                type: 'error',
                content: 'Error fetching DUG history!',
                duration: 2,
            });
        });
    }

    const handleBatteryHistoryRefresh = () => {
        messageApi.open({
            key,
            type: 'loading',
            content: 'Loading...',
        });
        getBatteryHistory(tablet.hid, tokens.AccessToken).then((batteryHistory) => {
            messageApi.open({
                key,
                type: 'success',
                content: 'Loaded!',
                duration: 2,
            });
            setBatteryHistory(batteryHistory);
        }).catch(() => {
            messageApi.open({
                key,
                type: 'error',
                content: 'Error fetching battery history!',
                duration: 2,
            });
        });
    }

    return (
        <MainLayout currentView="search">
            {contextHolder}

            <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <Search
                            placeholder="Buscar"
                            onSearch={onSearch}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            style={{ width: 500, padding: 5 }}
                        />
                        <p className="text-xs text-gray-500 text-start px-[5px]">
                            HID, ObjectId (10 caracteres) o email de recuperación
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate(-1)}
                        style={{ marginLeft: '15px', marginTop: '5px' }}
                    >
                        Go Back
                    </Button>
                </div>

                <Space direction="vertical" size={24} style={{ display: 'flex' }}>
                    <Row gutter={[24, 32]}>
                        <Col xs={24} sm={24} md={24} lg={16} xl={16}>
                            <Space direction="vertical" size={24} style={{ display: 'flex' }}>
                                {/* Nombre, modelo, hid: card principal */}
                                <TabletMainCard tablet={tablet} />

                                {/* Datos personales y ajustes de control parental */}
                                <Row gutter={[24, 32]}>
                                    <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                                        <TabletInfo
                                            personalInfo={tablet}
                                            handleRefresh={handleRefreshTablet}
                                            updateTabletField={updateTabletField}
                                        />
                                    </Col>
                                    <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                                        <Space direction="vertical" size={24} style={{ display: 'flex' }}>
                                            <TabletSettings
                                                personalInfo={tablet}
                                                handleRefresh={handleRefreshTablet}
                                                toggleParentalControl={toggleParentalControl}
                                            />

                                            {/* SIM: debajo de Ajustes, solo si hay una vinculada */}
                                            {simData && (
                                                <DeviceSIMCard
                                                    title="SIM vinculada"
                                                    simCard={simData}
                                                    handleRefresh={handleRefreshSim}
                                                    navSimDashboard={navSimDashboard}
                                                />
                                            )}
                                        </Space>
                                    </Col>
                                </Row>
                            </Space>
                        </Col>

                        <Col xs={24} sm={12} md={12} lg={8} xl={8}>
                            <Space direction="vertical" size={24} style={{ display: 'flex' }}>
                                {/* Comandos */}
                                <TabletCommands
                                    personalInfo={tablet}
                                    handleRefresh={handleRefreshTablet}
                                    handleFactory={handleFactory}
                                    handleUsbDebugging={handleUsbDebugging}
                                    handleDumpDatabase={handleDumpDatabase}
                                />
                            </Space>
                        </Col>
                    </Row>

                    <Space direction="vertical" size={12} style={{ display: 'flex' }}>
                        <Row>
                            <TableComponent
                                columns={userColumns}
                                data={usersData}
                                leftIcon="/images/tableIcons/cs-usersIcon.svg"
                                leftIconHeight={29}
                                leftIconWidth={38}
                                title='Usuarios'
                                subtitle='Tablet'
                                handleRefresh={handleRefreshTabletUsers}
                            />
                        </Row>
                        <Row>
                            <TabletAppsCard
                                apps={aplicationsData}
                                handleRefresh={handleRefreshApps}
                            />
                        </Row>
                        <Row>
                            <TabletBatteryHistory
                                data={batteryHistory}
                                handleRefresh={handleBatteryHistoryRefresh}
                            />
                        </Row>
                        <Row>
                            <TabletDugHistory
                                dugHistory={dugHistory}
                                handleRefresh={handleRefreshDugHistory}
                                setDugFromDate={setDugFromDate}
                                setDugToDate={setDugToDate}
                            />
                        </Row>
                    </Space>
                </Space>
            </div>
        </MainLayout>
    )
}
