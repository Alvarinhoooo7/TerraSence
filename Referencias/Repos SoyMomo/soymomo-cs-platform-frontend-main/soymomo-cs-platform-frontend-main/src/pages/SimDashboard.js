import MainLayout from '../layouts/layout';
import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import { Row, Space, Col, Input, message, Button } from 'antd'
import { useAuth, checkAuth } from "../authContext";
import useQuery from '../utils/hooks/UseQuery';
import AppVersionsCard from '../components/AppVersionsCard';
import { getSimInfo, getWearer } from '../services/wearerService';
import SimMainCard from '../components/SimMainCard';
import SimPlanCard from '../components/SimPlanCard';
import SimSubscriberCard from '../components/SimSubscriberCard';
import SimWearerCard from '../components/SIMWearerCard';
import SimActionsCard from '../components/SimActionsCard';
import SimTextCard from '../components/SimTextCard';
import { PaymentHistory } from '../components/PaymentHistory';
import axios from 'axios';

const { Search } = Input;

// Normaliza un valor de fecha de Parse ({ __type: 'Date', iso }) o string a ISO
const getIso = (value) => (value && value.iso) || value || null;

export default function SimDashboard() {
  const key = 'updatable';
  const { tokens } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  let query = useQuery();
  const [messageApi, contextHolder] = message.useMessage();
  const [inputValue, setInputValue] = useState('');
  const [simData, setSimData] = useState({});
  const [wearer, setWearer] = useState({});
  const [globalImei, setGlobalImei] = useState('')
  const [globalIccId, setGlobalIccId] = useState('')
  const [globalDeviceId, setGlobalDeviceId] = useState('')
  const [globalObjectId, setGlobalObjectId] = useState('')
  const [wearerPresent, setWearerPresent] = useState(true);
  const [deviceType, setDeviceType] = useState(location.state?.deviceType || 'watch');

  let imei;
  let iccId;
  let subObjectId;

  useEffect(() => {
    if (!tokens || !checkAuth(tokens)) {
      navigate('/login');
    }
  }, [tokens, navigate]);

  useEffect(() => {
    subObjectId = query.get('subObjectId');
    if (query.get('imei')) {
      imei = query.get('imei')
    }
    if (query.get('iccId')) {
      iccId = query.get('iccId')
    }
    if (!subObjectId && !imei && !iccId) {
      navigate('/not-found');
      return;
    }

    let params = {};
    if (deviceType === 'tablet') {
      if (subObjectId) {
        params.objectId = subObjectId;
        setGlobalObjectId(subObjectId);
      }
      if (imei) {
        params.imei = imei;
        setGlobalImei(imei);
      }
      if (iccId) {
        params.iccId = iccId;
        setGlobalIccId(iccId);
      }
      
      // Ensure we have at least one parameter
      if (!params.objectId && !params.imei && !params.iccId) {
        navigate('/not-found');
        return;
      }
    } else {
      if (subObjectId) {
        params = { subObjectId };
        setGlobalObjectId(subObjectId);
      } else if (imei) {
        params = { imei };
        setGlobalImei(imei);
      } else if (iccId) {
        params = { iccId };
        setGlobalIccId(iccId);
      }
    }

    if (deviceType === 'tablet') {
      axios.get(
        process.env.REACT_APP_BACKEND_HOST + '/tabletSim/tabletSimInfo',
        {
          params,
          headers: { Authorization: `Bearer ${tokens.AccessToken}` }
        }
      ).then((response) => {
        if (!response.data || !response.data.data || !response.data.data.results || !response.data.data.results[0]) {
          navigate('/not-found');
          return;
        }

        const body = response.data.data.results[0];

        const simCard = {
          iccId: body.iccId,
          imei: body.imei,
          plan: body.plan,
          subscriptionId: body.objectId,
          paymentId: body.apioCredentials?.apioSubscriptionId || body.paymentId,
          paymentStatus: body.apioCredentials?.apioSubscriptionStatus || body.status,
          remainingTrialDays: body.remainingTrialDays,
          providerName: body.sim?.mnoProvider?.name,
          phone: body.msisdn,
          state: body.status,
          networkProvider: body.sim?.networkOperator?.name,
          paymentProvider: body.paymentProvider?.name,
          subscriber: body.subscriber,
          cancellationExplanation: body.cancellationExplanation,
          stripeSubscriptionData: body.stripeCredentials?.stripeSubscriptionData,
          stripeSubscriptionId: body.stripeCredentials?.stripeSubscriptionId,
          apioCredentials: body.apioCredentials
        };

        setSimData(simCard);
      }).catch((error) => {
        if (error.response) {
          console.error('Tablet error response:', error.response.data);
        }
      });
    } else {
      getSimInfo(subObjectId, imei, iccId, tokens.AccessToken).then((response) => {

        if (!response.data || response.data.length === 0) {
          navigate('/not-found');
          return;
        }

        const body = response.data.data.results[0];
        const { type } = response.data.data;

        let simCard;
        let subId;
        let payId;
        let payStatus;

        if (type === 'Sub') {
          if (body.alaiSubscriptionId) {
            subId = body.alaiSubscriptionId;
          } else if (body.gigsSubscriptionId) {
            subId = body.gigsSubscriptionId;
          }
          if (body.apioCredentials && body.apioCredentials.apioSubscriptionId) {
            payId = body.apioCredentials.apioSubscriptionId;
            payStatus = body.apioCredentials.apioSubscriptionStatus;
          } else if (body.stripeCredentials && body.stripeCredentials.stripeSubscriptionId) {
            payId = body.stripeCredentials.stripeSubscriptionId;
            payStatus = body.stripeCredentials.subscriptionStatus;
          }

          simCard = {
            iccId: body.sim?.iccId,
            imei: body.imei,
            plan: body.plan,
            parseObjectId: body.objectId,
            subscriptionId: subId,
            paymentId: payId,
            paymentStatus: payStatus,
            remainingTrialDays: response.data.data.remainingTrialDays,
            providerName: body.sim?.mnoProvider?.name,
            phone: body.msisdn,
            state: body.status,
            networkProvider: body.sim?.networkOperator?.name,
            paymentProvider: body.paymentProvider?.name,
            subscriber: body.subscriber,
            cancellationExplanation: body.cancellationExplanation,
            stripeSubscriptionData: body.stripeCredentials?.stripeSubscriptionData,
            stripeSubscriptionId: body.stripeCredentials?.stripeSubscriptionId,
            apioCredentials: body.apioCredentials,
            activatedAt: getIso(body.activatedAt),
            terminatedAt: getIso(body.terminatedAt),
            scheduledDeactivationDate: getIso(body.scheduledDeactivationDate)
          };

          if (body.imei) {
            setGlobalImei(body.imei);
          }
        } else if (type === 'Sim') {
          simCard = {
            iccId: body.iccId,
            remainingTrialDays: response.data.data.remainingTrialDays,
            providerName: body.mnoProvider?.name,
            networkProvider: body.networkOperator?.name,
          };
        }

        setSimData(simCard);

        // Solo buscar wearer si es un dispositivo watch
        if (deviceType === 'watch') {
          let imeiValue;
          if (body.imei) {
            imeiValue = body.imei;
            setGlobalImei(body.imei)
          } else if (imei) {
            imeiValue = imei;
          }

          // Fetch reloj asociado
          if (imeiValue) {
            let payload;
            if (imeiValue.length === 10) {
              payload = { deviceId: imeiValue }
              setGlobalDeviceId(imeiValue)
            } else {
              payload = { imei: imeiValue }
              setGlobalImei(imeiValue)
            }
            getWearer(payload, tokens.AccessToken).then((response) => {
              if (!response.data || response.data.data.length === 0) {
                setWearerPresent(false);
                return;
              }
              setWearerPresent(true);
              setWearer(response.data.data[0]);
            }).catch(console.error);
          }
        }
      }).catch((error) => {
        console.error('Error fetching data:', error);
        console.error('Error response:', error.response);
      });
    }
  }, [query, navigate, tokens, deviceType])

  const handleSIMRefresh = () => {
    messageApi.open({
      key,
      type: 'loading',
      content: 'Loading...',
    });

    let params = {};
    if (deviceType === 'tablet') {
      if (globalObjectId) {
        params.objectId = globalObjectId;
      }
      if (globalImei) {
        params.imei = globalImei;
      }
      if (globalIccId) {
        params.iccId = globalIccId;
      }

      // Ensure we have at least one parameter
      if (!params.objectId && !params.imei && !params.iccId) {
        messageApi.open({
          key,
          type: 'error',
          content: 'No valid parameters for tablet refresh',
          duration: 2,
        });
        return;
      }
    } else {
      if (globalObjectId) {
        params.subObjectId = globalObjectId;
      } else if (globalIccId) {
        params.iccId = globalIccId;
      } else if (globalImei) {
        params.imei = globalImei;
      }
    }

    if (!Object.keys(params).length) return;

    if (deviceType === 'tablet') {
      axios.get(
        process.env.REACT_APP_BACKEND_HOST + '/tabletSim/tabletSimInfo',
        {
          params,
          headers: { Authorization: `Bearer ${tokens.AccessToken}` }
        }
      ).then((response) => {
        messageApi.open({
          key,
          type: 'success',
          content: 'Loaded!',
          duration: 2,
        });

        if (!response.data || !response.data.data || !response.data.data.results || !response.data.data.results[0]) {
          navigate('/not-found');
          return;
        }

        const body = response.data.data.results[0];

        const simCard = {
          iccId: body.iccId,
          imei: body.imei,
          plan: body.plan,
          subscriptionId: body.objectId,
          paymentId: body.apioCredentials?.apioSubscriptionId || body.paymentId,
          paymentStatus: body.apioCredentials?.apioSubscriptionStatus || body.status,
          remainingTrialDays: body.remainingTrialDays,
          providerName: body.sim?.mnoProvider?.name,
          phone: body.msisdn,
          state: body.status,
          networkProvider: body.sim?.networkOperator?.name,
          paymentProvider: body.paymentProvider?.name,
          subscriber: body.subscriber,
          cancellationExplanation: body.cancellationExplanation,
          stripeSubscriptionData: body.stripeCredentials?.stripeSubscriptionData,
          stripeSubscriptionId: body.stripeCredentials?.stripeSubscriptionId,
          apioCredentials: body.apioCredentials
        };

        setSimData(simCard);
      }).catch((error) => {
        messageApi.open({
          key,
          type: 'error',
          content: 'Error fetching data!',
          duration: 2,
        });
        console.error('Error refreshing tablet data:', error);
        if (error.response) {
          console.error('Tablet refresh error response:', error.response.data);
        }
      });
    } else {
      getSimInfo(params.subObjectId, params.imei, params.iccId, tokens.AccessToken).then((response) => {
        messageApi.open({
          key,
          type: 'success',
          content: 'Loaded!',
          duration: 2,
        });

        if (!response.data || response.data.length === 0) {
          navigate('/not-found');
          return;
        }

        const body = response.data.data.results[0];
        const { type } = response.data.data;
        let simCard;
        let subId;
        let payId;
        let payStatus;

        if (type === 'Sub') {
          if (body.alaiSubscriptionId) {
            subId = body.alaiSubscriptionId;
          } else if (body.gigsSubscriptionId) {
            subId = body.gigsSubscriptionId;
          }
          if (body.apioCredentials && body.apioCredentials.apioSubscriptionId) {
            payId = body.apioCredentials.apioSubscriptionId;
            payStatus = body.apioCredentials.apioSubscriptionStatus;
          } else if (body.stripeCredentials && body.stripeCredentials.stripeSubscriptionId) {
            payId = body.stripeCredentials.stripeSubscriptionId;
            payStatus = body.stripeCredentials.subscriptionStatus;
          }

          simCard = {
            iccId: body.sim?.iccId,
            imei: body.imei,
            plan: body.plan,
            parseObjectId: body.objectId,
            subscriptionId: subId,
            paymentId: payId,
            paymentStatus: payStatus,
            remainingTrialDays: response.data.data.remainingTrialDays,
            providerName: body.sim?.mnoProvider?.name,
            phone: body.msisdn,
            state: body.status,
            networkProvider: body.sim?.networkOperator?.name,
            paymentProvider: body.paymentProvider?.name,
            subscriber: body.subscriber,
            cancellationExplanation: body.cancellationExplanation,
            stripeSubscriptionData: body.stripeCredentials?.stripeSubscriptionData,
            stripeSubscriptionId: body.stripeCredentials?.stripeSubscriptionId,
            apioCredentials: body.apioCredentials,
            activatedAt: getIso(body.activatedAt),
            terminatedAt: getIso(body.terminatedAt),
            scheduledDeactivationDate: getIso(body.scheduledDeactivationDate)
          };
        } else if (type === 'Sim') {
          simCard = {
            iccId: body.iccId,
            remainingTrialDays: response.data.data.remainingTrialDays,
            providerName: body.mnoProvider?.name,
            networkProvider: body.networkOperator?.name,
          };
        }

        setSimData(simCard);

        // Solo buscar wearer si es un dispositivo watch
        if (deviceType === 'watch' && params.imei) {
          getWearer({ imei: params.imei }, tokens.AccessToken).then((response) => {
            if (!response.data || response.data.data.length === 0) {
              setWearerPresent(false);
              return;
            }
            setWearerPresent(true);
            setWearer(response.data.data[0]);
          }).catch(console.error);
        }
      }).catch(() => {
        messageApi.open({
          key,
          type: 'error',
          content: 'Error fetching data!',
          duration: 2,
        });
      });
    }
  }

  async function onSearch(value) {
    messageApi.open({
      key,
      type: 'loading',
      content: 'Loading...',
    });

    navigate(`/?searchTxt=${value}`);
  }

  async function navWearerDashboard() {
    messageApi.open({
      key,
      type: 'loading',
      content: 'Loading...',
    });

    const routeParam = globalDeviceId ? `?deviceId=${globalDeviceId}` : `?imei=${globalImei}`;
    navigate(`/wearer${routeParam}`, { state: { imei: globalImei, deviceId: globalDeviceId } });

    // navigate(`/wearer?imei=${globalImei}`, {state: { imei: globalImei }});
  }

  const openMessageApi = (message, type) => {
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
        duration: 2,
      });
    }
  }

  return (
    <MainLayout currentView="search">
      <>
        {contextHolder}
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 20, justifyContent: 'center' }}>
            <Search
              placeholder="Buscar"
              onSearch={onSearch}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ width: 500, padding: 5, display: 'flex', alignItems: 'center' }}
            />
          </div>

          <Space direction="vertical" size={24} style={{ display: 'flex' }}>
            <Row gutter={[24, 32]}>
              <Col xs={24} sm={24} md={24} lg={16} xl={16}>
                <Space direction="vertical" size={24} style={{ display: 'flex' }}>
                  <SimMainCard
                    simCard={simData}
                    handleRefresh={handleSIMRefresh}
                  />
                  <Row gutter={[24, 32]}>
                    <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                      <SimPlanCard
                        simCard={simData}
                        handleRefresh={handleSIMRefresh}
                      />
                      {simData.state === 'TERMINATED' && (
                        <SimTextCard
                          simCard={simData}
                          handleRefresh={handleSIMRefresh}
                        />
                      )}
                    </Col>
                    <Col xs={24} sm={24} md={24} lg={12} xl={12}>
                      <Space direction="vertical" size={24} style={{ display: 'flex' }}>
                        <SimSubscriberCard
                          simCard={simData}
                          handleRefresh={handleSIMRefresh}
                        />
                        {deviceType === 'watch' && wearerPresent && (
                          <SimWearerCard
                            wearer={wearer}
                            wearerPresent={wearerPresent}
                            handleRefresh={handleSIMRefresh}
                            navWearerDashboard={navWearerDashboard}
                          />
                        )}
                      </Space>
                    </Col>
                  </Row>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={12} lg={8} xl={8}>
                <Space direction="vertical" size={24} style={{ display: 'flex' }}>
                  <AppVersionsCard 
                    imei={globalImei}
                    deviceId={globalDeviceId}
                    deviceType={deviceType}
                    versionAndroid="5.2.6"
                    versionApple="5.2.6"
                  />
                  {deviceType !== 'tablet' && (
                    <SimActionsCard
                      simCard={simData}
                      openMessageApi={openMessageApi}
                      handleSIMRefresh={handleSIMRefresh}
                    />
                  )}
                  <PaymentHistory 
                    apioSubscriptionId={simData?.apioCredentials?.apioSubscriptionId}
                    stripeSubscriptionId={simData?.stripeSubscriptionId}
                    paymentId={simData?.paymentId}
                  />
                </Space>
              </Col>
            </Row>
          </Space>
        </div>
      </>
    </MainLayout>
  );
}