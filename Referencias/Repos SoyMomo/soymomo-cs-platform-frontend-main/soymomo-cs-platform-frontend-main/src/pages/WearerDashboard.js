import MainLayout from '../layouts/layout';
import styles from '../styles/WearerDashboard.module.css';
import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Space, Col, Input, Button, Modal, InputNumber, DatePicker } from 'antd'
import { friendMessageColumns, friendsColumns, userColumns, chatUserColumns } from '../components/tables/wearerColumns';
import { useAuth, checkAuth } from "../authContext";
import TableComponent from '../components/tables/table'
import useQuery from '../utils/hooks/UseQuery';
import ComandsComponent from '../components/Comands';
import WearerInfo from '../components/WearerInfo';
import WearerSettings from '../components/WearerSettings';
import WearerMainCard from '../components/WearerMainCard';
import AppVersionsCard from '../components/AppVersionsCard';
import WearerBatteryHistory from '../components/WearerBatteryHistory';
import useBatteryHistory from '../utils/hooks/UseBatteryHistory';
import WearerContactCard from '../components/WearerContactCard';
// import SimMainCard from '../components/SimMainCard';
import {
  getWearer,
  getWatchUsers,
  getFriends,
  getChatUser,
  getChatWearer,
  getSimInfo,
  updateWatchUserStatus,
  deleteWatchUser,
  changeAdmin,
  editWearer,
  updateWearerSettings,
  getWatchBuildInfo,
  getWatchInstalledApps,
  getWatchPushyPresence
} from '../services/wearerService';
import DeviceSIMCard from '../components/DeviceSIMCard';
import WearerSimHistoryCard from '../components/WearerSimHistoryCard';
// import SimPlanCard from '../components/SimPlanCard';
import dayjs from 'dayjs';
import axios from 'axios';
import AppListCard from '../components/AppListCard';
import ConnectivityCard from '../components/ConnectivityCard';
import useConnectivity from '../utils/hooks/UseConnectivity';
import ApnCard from '../components/ApnCard';
import useApn from '../utils/hooks/UseApn';

const { Search } = Input;

export default function WearerDashboard() {
  const { tokens } = useAuth();
  const key = 'updatable';
  const [inputValue, setInputValue] = useState('');
  const [friendMessageData, setFriendMessageData] = useState([]);
  const [friendData, setFriendData] = useState([]);
  const [userMessageData, setUserMessageData] = useState([]);
  const [users, setUsers] = useState([]);

  let query = useQuery();
  const [wearer, setWearer] = useState({});
  const [watchSettings, setWatchSettings] = useState({});
  const [simData, setSimData] = useState({});
  const [simHistory, setSimHistory] = useState([]);
  const [watchUserColumnsAux, setWatchUserColumnsAux] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [heartsInput, setHeartsInput] = useState('');
  const [birthDayInput, setBirthDayInput] = useState(new Date());
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [type, setType] = useState('');
  const [objectIdToDelete, setObjectIdToDelete] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [objectIdToGiveAdmin, setObjectIdToGiveAdmin] = useState('');
  const [watchBuildData, setWatchBuildData] = useState('');
  const [watchId, setWatchId] = useState('');
  const [installedApps, setInstalledApps] = useState([]);
  const [watchStatusUpdatedAt, setWatchStatusUpdatedAt] = useState('');
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [pushyPresence, setPushyPresence] = useState(null);

  // Extract the relevant part from buildInfoId
  const extractedBuildInfo = watchBuildData && watchBuildData.buildNumber ? (() => {
    const parts = watchBuildData.buildNumber.split(' ');
    
    const devKeysPart = parts.find(part => part === 'dev-keys');
    const buildIdPart = parts.find(part => /^OPM\d+\.\d+\.\d+$/.test(part));
    
    if (buildIdPart && devKeysPart) {
      return `${buildIdPart} ${devKeysPart}`;
    }
    
    return watchBuildData.buildNumber;
  })() : '';

  const navigate = useNavigate();

  const { state } = useLocation()
  let { imei } = state

  // Mapea una suscripción al shape de la card resumen
  const mapSubToSummary = (sub, remainingTrialDays) => ({
    iccId: sub.sim?.iccId,
    plan: sub.plan,
    remainingTrialDays,
    providerName: sub.sim?.mnoProvider?.name,
    phone: sub.msisdn,
    state: sub.status,
    networkProvider: sub.sim?.networkOperator?.name,
    parseObjectId: sub.objectId,
  });

  // Mapea una suscripción al shape de cada item del historial
  const mapSubToHistoryItem = (sub) => {
    const rawTerminatedAt = sub.terminatedAt?.iso || sub.terminatedAt || '';
    return {
      objectId: sub.objectId,
      iccId: sub.sim?.iccId || sub.iccId || '',
      state: sub.status || '',
      planName: sub.plan?.title || '',
      terminatedAt: rawTerminatedAt
        ? dayjs(rawTerminatedAt).format('DD/MM/YYYY')
        : '',
      createdAt: sub.createdAt,
    };
  };

  // Ordena por fecha de creación descendente: el más reciente primero
  const sortByCreatedAtDesc = (results) =>
    [...results].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  // Procesa la respuesta de /sim/simInfo: resumen = sub creada más recientemente,
  // historial = el resto de planes anteriores
  const applySimInfoResponse = (response) => {
    const data = response?.data?.data;
    const results = data?.results || [];

    if (results.length === 0 || data?.type !== 'Sub') {
      setSimData({});
      setSimHistory([]);
      return;
    }

    const sorted = sortByCreatedAtDesc(results);
    setSimData(mapSubToSummary(sorted[0], data.remainingTrialDays));
    setSimHistory(sorted.slice(1).map(mapSubToHistoryItem));
  };

// Usar el Hook de Historial de Batería
  const {
    batteryHistory,
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    fetchBatteryHistory,
    resetFilters,
    messageApi,
    contextHolder
  } = useBatteryHistory(tokens, wearer);

  // Autenticación
  useEffect(() => {
    if (!tokens || !checkAuth(tokens)) {
      navigate('/login');
    }
  }, [tokens, navigate]);

  // Fetch Wearer Info
  useEffect(() => {
    const deviceId = query.get('deviceId');
    if (query.get('imei')) {
      imei = query.get('imei')
    }
    // const imei = query.get('imei');
    if (!deviceId && !imei) {
      navigate('/not-found');
      return;
    }
    let params = {};
    if (deviceId) {
      params = { deviceId };
    } else if (imei) {
      params = { imei };
    }

    getWearer(params, tokens.AccessToken).then((response) => {
          if (!response.data || response.data.data.length === 0) {
        navigate('/not-found');
        return;
      }
      const wearerData = response.data.data[0]
      setWearer(wearerData);
      setWatchSettings(response.data.includes[0].settings);
      setWatchId(wearerData.objectId)

    }).catch(console.error);
    
    getWatchUsers(params, tokens.AccessToken).then((response) => {
      setUsers(response);
    }).catch(console.error);


    getSimInfo(null, imei, null, tokens.AccessToken).then((response) => {
      applySimInfoResponse(response);
    }).catch(console.error)
    setWatchUserColumnsAux(userColumns)
  }, [query, navigate, tokens])

  // Fetch Wearer Friends
  useEffect(() => {
    const deviceId = query.get('deviceId');
    const imei = query.get('imei');
    let params = {};
    if (deviceId) {
      params = { deviceId };
    } else if (imei) {
      params = { imei };
    }
    getFriends(params, deviceId, imei, tokens.AccessToken).then((response) => {
      setFriendData(response);
    });
  }, [query, wearer, tokens])

  // Fetch Chat Users
  useEffect(() => {
    const deviceId = query.get('deviceId');
    const imei = query.get('imei');
    let params = {};
    if (deviceId) {
      params = { deviceId };
    } else if (imei) {
      params = { imei };
    }
    getChatUser(params, tokens.AccessToken).then((response) => {
      setUserMessageData(response);
    }).catch(console.error);
  }, [query, wearer, tokens])

  //Fetch Build info
  useEffect(() => {
    if (watchId) {
      getWatchBuildInfo(watchId, tokens.AccessToken).then((response) => {
        const buildInfo = response.data.data
        const parsedBuildInfo = JSON.parse(buildInfo);

        setWatchBuildData(parsedBuildInfo);
        setWatchId(watchId)
      }).catch(console.error);
    }
  }, [watchId, tokens]);

  // Presencia Pushy: el backend resuelve el token y la api key segun el modelo
  const fetchPushyPresence = useCallback(() => {
    if (!watchId) return Promise.resolve();
    return getWatchPushyPresence(watchId, tokens.AccessToken)
      .then((response) => {
        setPushyPresence(response?.data?.data ?? null);
      })
      .catch(() => {
        // Se deja el bloque visible en gris en vez de hacerlo desaparecer
        setPushyPresence({
          supported: true,
          hasToken: true,
          online: null,
          lastActive: null,
          error: 'pushy_unavailable',
        });
      });
  }, [watchId, tokens]);

  useEffect(() => {
    fetchPushyPresence();
  }, [fetchPushyPresence]);

  // Fetch Chat Wearer
  useEffect(() => {
    const deviceId = query.get('deviceId');
    const imei = query.get('imei');
    let params = {};
    if (deviceId) {
      params = { deviceId };
    } else if (imei) {
      params = { imei };
    }
    getChatWearer(params, tokens.AccessToken).then((response) => {
      setFriendMessageData(response);
    }).catch(console.error);
  }, [query, wearer, tokens])

  // Fetch installed apps
  useEffect(() => {
    if (watchId) {
      setAppsLoaded(false);
      getWatchInstalledApps(watchId, tokens.AccessToken)
        .then((response) => {
          if (response.data && response.data.data && response.data.data.installedApps) {
            setInstalledApps(response.data.data.installedApps);
            setWatchStatusUpdatedAt(response.data.data.watchStatusUpdatedAt || '');
          } else {
            setInstalledApps([]);
            setWatchStatusUpdatedAt('');
          }
          setAppsLoaded(true);
        })
        .catch((error) => {
          setInstalledApps([]);
          setWatchStatusUpdatedAt('');
          setAppsLoaded(true);
        });
    }
  }, [watchId, tokens]);

  useEffect(() => {
    let cols = userColumns;
    let authAction = cols[cols.length - 3];
    let deleteAction = cols[cols.length - 2];
    let giveAdminAction = cols[cols.length - 1];
    authAction.render = (row) => {
      return (
        <button onClick={async () => {
          await updateWatchUser(row.watchUserId, row.authorized == 'Si' ? false : true)
      }} 
      disabled={row.authorized == 'Si'} 
      style={{backgroundColor: row.authorized == 'Si' ? '#FB88AF' : '#32B8C0', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>
      {row.authorized == 'Si' ? "Autorizado" : "Autorizar"}
      </button>
      )
    }
    deleteAction.render = (row) => {
      if (row?.objectId === wearer?.userInCharge?.objectId) {
        return (
          <div>
            Admin
          </div>
        )
      }
      return (
        <button onClick={async () => {
          if (row?.watchUserId) { 
            deleteWatchUserBtn(row.watchUserId);
          }
      }}
      style={{backgroundColor: '#F93C7C', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>Eliminar
      </button>
      )
    }
    giveAdminAction.render = (row) => {
      if (row && row.objectId && wearer && wearer.userInCharge && wearer.userInCharge.objectId) {

      if (row.objectId === wearer.userInCharge.objectId) {
        return (
          <div>
            Admin
          </div>
        )
      }}
      return (
        <button onClick={async () => {
          giveAdminBtn(row.objectId)
      }}
      style={{backgroundColor: row.admin == 'Si' ? '#F93C7C' : '#32B8C0', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>{row.admin == 'Si' ? "Quitar admin" : "Dar admin"}
      </button>
      )
    }
    cols[cols.length - 3] = authAction;
    cols[cols.length - 2] = deleteAction;
    cols[cols.length - 1] = giveAdminAction;
    setWatchUserColumnsAux(cols)
  }, [query, wearer, tokens])

 // #region Handle Refreshes


  const handleWatchUserRefresh = async () => {
    try {
      openMessageApi('Loading...', 'loading');
      
      if (!wearer.deviceId && !wearer.imei) {
        openMessageApi('Error: No device information available', 'error');
        return;
      }

      const params = { 
        deviceId: wearer.deviceId, 
        imei: wearer.imei 
      };
      
      const response = await getWatchUsers(params, tokens.AccessToken);
      
      if (!Array.isArray(response)) {
        openMessageApi('Error: Invalid response format', 'error');
        return;
      }

      setUsers(response);
      openMessageApi('Loaded!', 'success');
      return response;
    } catch (error) {
      openMessageApi('Error fetching data!', 'error');
      throw error;
    }
  }

  const handleFriendsRefresh = () => {
    openMessageApi('Loading...', 'loading');
    const params = { deviceId: wearer.deviceId, imei: wearer.imei };
    return getFriends(params, params.deviceId, params.imei, tokens.AccessToken).then((response) => {
      openMessageApi('Loaded!', 'success');
      setFriendData(response);
    }).catch(() => {
      openMessageApi('Error fetching data!', 'error');
    });
  }

  const handleChatUserRefresh = () => {
    openMessageApi('Loading...', 'loading');
    const params = { deviceId: wearer.deviceId, imei: wearer.imei };
    return getChatUser(params, tokens.AccessToken).then((response) => {
      openMessageApi('Loaded!', 'success');
      setUserMessageData(response);
    }).catch(() => {
      openMessageApi('Error fetching data!', 'error');
    });
  }

  const handleChatWearerRefresh = () => {
    openMessageApi('Loading...', 'loading');
    const params = { deviceId: wearer.deviceId, imei: wearer.imei };
    return getChatWearer(params, tokens.AccessToken).then((response) => {
      openMessageApi('Loaded!', 'success');
      setFriendMessageData(response);
    }).catch(() => {
      openMessageApi('Error fetching data!', 'error');
    });
  }



  const handleSIMRefresh = () => {
    openMessageApi('Loading...', 'loading');

    let imeiValue;

    if (imei) {
      imeiValue = imei;
    } else if (wearer && wearer.imei) {
      imeiValue = wearer.imei
    } else return;

    return getSimInfo(null, imeiValue, null, tokens.AccessToken).then((response) => {
      openMessageApi('Loaded!', 'success');
      applySimInfoResponse(response);
    }).catch(() => {
      openMessageApi('Error fetching data!', 'error');
    });
  }

  const handleWearerInfoRefresh = () => {
    const params = {
      deviceId: wearer.deviceId,
      imei: wearer.imei,
    }
    openMessageApi('Loading...', 'loading');
    
    return getWearer(params, tokens.AccessToken).then((response) => {
      if (!response.data || response.data.data.length === 0) {
        openMessageApi('Error fetching data!', 'error');
        return;
      }
      openMessageApi('Loaded!', 'success');
      setWearer(response.data.data[0]);
      setWatchSettings(response.data.includes[0].settings);
    }).catch(() => {
      openMessageApi('Error fetching data!', 'error');
    });
  }

  // Refrescar apps instaladas
  const handleInstalledAppsRefresh = () => {
    if (watchId) {
      setAppsLoaded(false);
      getWatchInstalledApps(watchId, tokens.AccessToken)
        .then((response) => {
          if (response.data && response.data.data && response.data.data.installedApps) {
            setInstalledApps(response.data.data.installedApps);
            setWatchStatusUpdatedAt(response.data.data.watchStatusUpdatedAt || '');
          } else {
            setInstalledApps([]);
            setWatchStatusUpdatedAt('');
          }
          setAppsLoaded(true);
        })
        .catch((error) => {
          setInstalledApps([]);
          setWatchStatusUpdatedAt('');
          setAppsLoaded(true);
        });
    }
  };

  // #endregion

  async function navSimDashboard() {
    openMessageApi('Loading...', 'loading');
    navigate(`/sim/dashboard?imei=${imei}`, {state: { imei }});
  }

  // Navega a la vista de SIM de una suscripción específica por su objectId
  async function navSimDashboardBySub(subObjectId) {
    if (!subObjectId) {
      navSimDashboard();
      return;
    }
    openMessageApi('Loading...', 'loading');
    navigate(`/sim/dashboard?subObjectId=${subObjectId}`, { state: { imei } });
  }

  async function onSearch(value) {
    openMessageApi('Loading...', 'loading');
    navigate(`/?searchTxt=${value}`);
  }


  async function resetWatch(deviceId, imei) {
    try {
        openMessageApi('Loading...', 'loading')
        if (!deviceId && imei) {
            deviceId = imei.slice(4, 14);
        } else if (!deviceId && !imei) {
          throw new Error('Error, no deviceId or imei provided.');
        }
        const response = await axios.post(
            process.env.REACT_APP_BACKEND_HOST +'/wearer/resetWearer',
            { deviceId },
            { 
                headers: { Authorization: `Bearer ${tokens.AccessToken}` }
            }
        );
        if (response.status === 201 || response.status === 200) {
            openMessageApi('Success!', 'success')
            // Esperar a que todas las funciones de refresh terminen
            await Promise.all([
                handleWearerInfoRefresh(),
                handleWatchUserRefresh(),
                handleFriendsRefresh(),
                handleChatUserRefresh(),
                handleChatWearerRefresh(),
                handleSIMRefresh()
            ]);
        } else {
            openMessageApi(`Error ${response.status}: ${response.data.error}`, 'error')
        }
    } catch (error) {
        openMessageApi(`Error: ${error.message}`, 'error')
    }
  }

  async function updateWatchUser(watchUserObjectId, active) {
    try {
      openMessageApi('Loading...', 'loading')
      const response = await updateWatchUserStatus(watchUserObjectId, active, tokens.AccessToken);
      if (response.status === 201 || response.status === 200) {
          openMessageApi('Success!', 'success')
          handleWatchUserRefresh()
      } else {
          openMessageApi(`Error ${response.status}: ${response.data.error}`, 'error')
      }
    } catch (error) {
        openMessageApi(`Error: ${error.message}`, 'error')
    }
  }

  function deleteWatchUserBtn(watchUserObjectId) {
    setIsConfirmationModalVisible(true);
    setType('deleteWatchUser');
    setModalTitle('Estas seguro de eliminar este usuario?');
    setObjectIdToDelete(watchUserObjectId);
  }
  
  function giveAdminBtn(newAdminObjectId) {
    setIsConfirmationModalVisible(true);
    setType('giveAdmin');
    setModalTitle('Estas seguro de darle permisos de administrador a este usuario?');
    setObjectIdToGiveAdmin(newAdminObjectId);
  }


  const openMessageApi = (message, type, duration=2) => {
    if (type === 'loading') {
      messageApi.open({
        key,
        type,
        content: message,
      });
    } else {
      messageApi.open({
        key,
        type,
        content: message,
        duration,
      });
    }
  }

  // Diagnostico de conectividad (version de la app del reloj + presencia)
  const connectivity = useConnectivity(watchId, openMessageApi);

  useEffect(() => {
    connectivity.fetchDiagnosis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectivity.fetchDiagnosis]);

  // Catalogo de APNs y envio del perfil elegido al reloj
  const apn = useApn(watchId, openMessageApi);

  useEffect(() => {
    apn.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apn.load]);

  const handleOpenEditWearer = () => {
    setFirstNameInput(wearer.firstName ?? "");
    setLastNameInput(wearer.lastName ?? "");
    setPhoneInput(wearer.phone ?? "");
    setHeightInput(wearer.height ?? 1);
    setWeightInput(wearer.weight ?? 1);
    setHeartsInput(wearer.hearts ?? 0);
    const birthday = wearer.birthday ?? new Date()
    const birthdayIso = birthday.iso ?? new Date().toISOString();
    setBirthDayInput(dayjs(birthdayIso));
    setIsEditModalVisible(true);
  }

  const handleOkEditModal = async () => {
    try {
      openMessageApi('Loading...', 'loading')
      const response = await editWearer(wearer.objectId, {
        firstName: firstNameInput,
        lastName: lastNameInput,
        phone: phoneInput,
        height: heightInput,
        weight: weightInput,
        hearts: heartsInput,
        birthday: birthDayInput
      }, tokens.AccessToken);
      setWearer(response.data.data);
      setIsEditModalVisible(false);
      openMessageApi('Success!', 'success')
    } catch(error) {
      openMessageApi(`Error: ${error.message}`, 'error')
    }
  }

  const handleCancelEditModal = () => {
    setIsEditModalVisible(false);
  }

  const handleOkConfirmModal = async () => {
    try {
      openMessageApi('Loading...', 'loading')
      setIsConfirmationModalVisible(false);
      if (type === 'deleteWatchUser') {
        await deleteWatchUser(objectIdToDelete, tokens.AccessToken);
        handleWatchUserRefresh();
        setObjectIdToDelete('');
      } else if (type === 'giveAdmin') {
        await changeAdmin(wearer.deviceId, objectIdToGiveAdmin, tokens.AccessToken);
        handleWearerInfoRefresh();
        setObjectIdToGiveAdmin('');
      }
      setType('');
      openMessageApi('Success!', 'success')
    } catch (error) {
      openMessageApi(`Error: ${error.message}`, 'error')
    }
  }

  const handleCancelConfirmModal = () => {
    setIsConfirmationModalVisible(false);
    setObjectIdToDelete('');
  }

  const editWatchSettings = async (watchSettings) => {
    openMessageApi('Loading...', 'loading')
    try {
      await updateWearerSettings(wearer.deviceId, watchSettings, tokens.AccessToken);
      // setWatchSettings(response.data.data.settings);
      handleWearerInfoRefresh();
      openMessageApi('Success!', 'success')
    } catch (error) {
      openMessageApi(`Error: ${error.message}`, 'error')
    }
  }

  return (
    <MainLayout currentView="search">
      <Modal
        title={modalTitle}
        onOk={handleOkConfirmModal}
        onCancel={handleCancelConfirmModal}
        open={isConfirmationModalVisible}
      />

      <Modal
        title="Editar Reloj"
        onOk={handleOkEditModal}
        onCancel={handleCancelEditModal}
        open={isEditModalVisible}
        footer={[
          <Button key="back" onClick={handleCancelEditModal}>
            Return
          </Button>,
          <Button
            key="submit"
            type="primary"
            className={styles.submitBtn}
            onClick={handleOkEditModal}
          >
            OK
          </Button>,
        ]}
      >
        <table>
          <tr>
            <td>FirstName:</td>
            <td>
              <Input
                value={firstNameInput}
                onChange={(e) => setFirstNameInput(e.target.value)}
              />
            </td>
          </tr>
          <tr>
            <td>LastName:</td>
            <td>
              <Input
                value={lastNameInput}
                onChange={(e) => setLastNameInput(e.target.value)}
              />
            </td>
          </tr>
          <tr>
            <td>Phone:</td>
            <td>
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </td>
          </tr>
          <tr>
            <td>Height:</td>
            <td>
              <InputNumber
                min={1}
                keyboard={true}
                value={heightInput}
                onChange={(e) => setHeightInput(e)}
              />
            </td>
          </tr>
          <tr>
            <td>Weight:</td>
            <td>
              <InputNumber
                min={1}
                keyboard={true}
                value={weightInput}
                onChange={(e) => setWeightInput(e)}
              />
            </td>
          </tr>
          <tr>
            <td>Hearts:</td>
            <td>
              <InputNumber
                min={0}
                keyboard={true}
                value={heartsInput}
                onChange={(e) => setHeartsInput(e)}
              />
            </td>
          </tr>
          <tr>
            <td>Birthday:</td>
            <td>
              <DatePicker
                value={birthDayInput}
                onChange={(_, dateString) =>
                  setBirthDayInput(dayjs(dateString))
                }
              />
            </td>
          </tr>
        </table>
      </Modal>

      <div style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          {contextHolder}
          <Search
            placeholder="Buscar"
            onSearch={onSearch}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{ width: 500, padding: 5 }}
          />
          <Button
            onClick={() => navigate(-1)}
            style={{ marginLeft: "15px", marginTop: "5px" }}
          >
            Go Back
          </Button>
        </div>
        <Space direction="vertical" size={24} style={{ display: "flex" }}>
          <Row gutter={[24, 32]}>
            <Col xs={24} sm={24} md={24} lg={16} xl={16}>
              {/* Dimensiones 240 + 24 + 424 + 24 + 256 = 968 */}
              <Space direction="vertical" size={24} style={{ display: "flex" }}>
                {/* Nombre, numero, imei: card principal */}
                <WearerMainCard
                  wearer={wearer}
                  openEditModal={handleOpenEditWearer}
                />
                {/* Nombre, numero, imei: card principal */}

                
                {extractedBuildInfo && extractedBuildInfo !== "OPM2.171019.012 dev-keys" && (wearer.hardwareModel === "Soymomo_Space_v3" || wearer.hardwareModel === "Soymomo_Space_v4") && (
                  <div style={{ 
                    padding: '18px', 
                    backgroundColor: '#fee2e2',
                    borderRadius: '8px'
                  }}>
                    <strong>⚠️ Alerta:</strong> Este reloj tiene el firmware desactualizado
                    <br />
                      Es obligatorio que pase por la oficina para actualizar a la última versión
                  </div>
                )}
                

                {/* Datos principales y Ultima conexion con SoyMomoSIM */}
                <Row gutter={[24, 32]}>
                  {/* Datos principales */}
                  <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                    <Space direction="vertical" size={16} style={{ display: "flex" }}>
                      <WearerInfo
                        title="Datos principales"
                        subtitle="Reloj"
                        leftIcon="/images/cs-wearerInfo.svg"
                        leftIconWidth={24}
                        leftIconHeight={29}
                        handleRefresh={handleWearerInfoRefresh}
                        wearer={wearer}
                      />
                      {(wearer.hardwareModel === "Soymomo_Space_v3" || wearer.hardwareModel === "Soymomo_Space_v4") && appsLoaded && (
                        <AppListCard 
                          apps={installedApps} 
                          handleRefresh={handleInstalledAppsRefresh}
                          watchStatusUpdatedAt={watchStatusUpdatedAt}
                        />
                      )}
                    </Space>
                  </Col>
                  {/* Datos principales */}

                  {/* Ultima conexion con SoyMomoSIM */}
                  <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                    <Space
                      direction="vertical"
                      size={24}
                      style={{ display: "flex" }}
                    >
                      {/* Ultima conexion */}
                      <ConnectivityCard
                        lastTKQ={wearer.lastTKQ}
                        pushy={pushyPresence}
                        diagnosis={connectivity.diagnosis}
                        inProgress={connectivity.inProgress}
                        onRefresh={() => {
                          handleWearerInfoRefresh();
                          fetchPushyPresence();
                          connectivity.refresh();
                        }}
                        onConfirm={() =>
                          connectivity.diagnosis?.track === 'space2'
                            ? connectivity.runSpace2Repush()
                            : connectivity.runInstallAuthManager()
                        }
                      />
                      {/* Ultima conexion */}

                      {/* APN */}
                      <ApnCard
                        countries={apn.countries}
                        selectedCountry={apn.selectedCountry}
                        onSelectCountry={apn.selectCountry}
                        loadingOptions={apn.loadingOptions}
                        catalog={apn.catalog}
                        catalogLoaded={apn.catalogLoaded}
                        catalogError={apn.catalogError}
                        lastTKQ={wearer.lastTKQ}
                        selectedApnId={apn.selectedApnId}
                        onSelect={apn.setSelectedApnId}
                        inProgress={apn.inProgress}
                        onSend={apn.sendSelectedApn}
                        onRefresh={apn.refresh}
                      />
                      {/* APN */}

                      {/* SoyMomoSIM */}
                      <DeviceSIMCard
                        light
                        simCard={simData}
                        handleRefresh={handleSIMRefresh}
                        navSimDashboard={() =>
                          navSimDashboardBySub(simData.parseObjectId)
                        }
                      />
                      {/* SoyMomoSIM */}

                      {/* Planes anteriores */}
                      {simHistory.length > 0 && (
                        <WearerSimHistoryCard
                          history={simHistory}
                          handleRefresh={handleSIMRefresh}
                          navSimDashboard={navSimDashboardBySub}
                        />
                      )}
                      {/* Planes anteriores */}
                    </Space>
                  </Col>
                  {/* Ultima conexion con SoyMomoSIM */}
                </Row>
                {/* Datos principales y Ultima conexion con SoyMomoSIM */}

                {/* Historial de bateria */}
                {/* Historial de bateria */}
              </Space>
            </Col>

            <Col xs={24} sm={12} md={12} lg={8} xl={8}>
              {/* Dimensiones 120 + 24 + 400 + 24 + 400 = 968 */}
              <Space direction="vertical" size={24} style={{ display: "flex" }}>
                {/* Ultima actualizacion */}
                <AppVersionsCard versionAndroid="5.2.6" versionApple="5.2.6" />
                {/* Ultima actualizacion */}

                {/* Comandos */}
                <ComandsComponent
                  leftIcon="/images/cs-comands.svg"
                  title="Comandos"
                  subtitle="Modificar"
                  leftIconWidth={24}
                  leftIconHeight={24}
                  imei={wearer.imei}
                  deviceId={wearer.deviceId}
                  resetWatch={resetWatch}
                  openMessageApi={openMessageApi}
                  watchInfo={{
                    wearer,
                    users: users.length,
                    friends: friendData.length,
                    userMessages: userMessageData.length,
                    friendMessages: friendMessageData.length,
                  }}
                  hardwareModel={wearer.hardwareModel}
                  buildInfoId={extractedBuildInfo}
                />
                {/* Comandos */}

                {/* Ajustes reloj */}
                <WearerSettings
                  title="Ajustes reloj"
                  subtitle="Configuración"
                  leftIcon="/images/cs-wearerSettings.svg"
                  leftIconWidth={24}
                  leftIconHeight={29}
                  handleRefresh={handleWearerInfoRefresh}
                  watchSettings={watchSettings}
                  editWatchSettings={editWatchSettings}
                />
                {/* Ajustes reloj */}
              </Space>
            </Col>
          </Row>

          <Space direction="vertical" size={12} style={{ display: "flex" }}>
            <Row>
              <TableComponent
                columns={watchUserColumnsAux}
                data={users}
                leftIcon="/images/tableIcons/cs-usersIcon.svg"
                leftIconHeight={29}
                leftIconWidth={38}
                handleRefresh={handleWatchUserRefresh}
                title="Usuarios"
                subtitle="Familiares"
              />
            </Row>

            <Row>
              <WearerContactCard wearer={wearer} tokens={tokens} />
            </Row>
            <Row>
              <TableComponent
                columns={friendsColumns}
                data={friendData}
                leftIcon="/images/tableIcons/cs-friendsHeart.svg"
                leftIconHeight={27}
                leftIconWidth={31}
                handleRefresh={handleFriendsRefresh}
                title="Amigos"
                subtitle="Aprobación"
              />
            </Row>
            {/* <Row gutter={[24, 32]}>
              <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                <TableComponent
                  columns={wifiColumns}
                  data={wifiData}
                  leftIcon="/images/tableIcons/cs-wifiIcon.svg"
                  leftIconHeight={0}
                  leftIconWidth={32}
                  refreshLink="/api/refresh"
                  title='Historial de conexión'
                  subtitle='Internet'
                />
              </Col>
              <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                <TableComponent
                  columns={friendsColumns}
                  data={friendData}
                  leftIcon="/images/tableIcons/cs-friendsHeart.svg"
                  leftIconHeight={27}
                  leftIconWidth={31}
                  refreshLink="/api/refresh"
                  title='Amigos'
                  subtitle='Aprobación'
                />
              </Col>
            </Row> */}
            <Row gutter={[24, 32]}>
              <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                <TableComponent
                  columns={friendMessageColumns}
                  data={friendMessageData}
                  leftIcon="/images/tableIcons/cs-friendMessagesIcon.svg"
                  leftIconHeight={29}
                  leftIconWidth={24}
                  handleRefresh={handleChatWearerRefresh}
                  title="Mensajes de amigos"
                  subtitle="Externos"
                  enablePagination={false}
                  scrollHeight={400}
                />
              </Col>
              <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                <TableComponent
                  columns={chatUserColumns}
                  data={userMessageData}
                  leftIcon="/images/tableIcons/cs-userMessagesIcon.svg"
                  leftIconHeight={29}
                  leftIconWidth={24}
                  handleRefresh={handleChatUserRefresh}
                  title="Mensajes de usuarios"
                  subtitle="Familiares"
                  enablePagination={false}
                  scrollHeight={400}
                />
              </Col>
            </Row>
            <Row>
                  <WearerBatteryHistory
                    data={batteryHistory}
                    handleRefresh={fetchBatteryHistory}
                    fromDate={fromDate}
                    toDate={toDate}
                    setFromDate={setFromDate}
                    setToDate={setToDate}
                    fetchBatteryHistory={fetchBatteryHistory}
                    resetFilters={resetFilters}
                  />
            
            </Row>
          </Space>
        </Space>
      </div>
    </MainLayout>
  );
}