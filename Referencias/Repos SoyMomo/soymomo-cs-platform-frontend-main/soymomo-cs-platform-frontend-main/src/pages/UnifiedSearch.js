import MainLayout from "../layouts/layout";
import { useNavigate } from "react-router-dom";
import { Input, message, Button } from 'antd'
import React, { useState, useEffect, useRef } from "react";
import { useAuth, checkAuth } from "../authContext";
import axios from 'axios';
import useQuery from "../utils/hooks/UseQuery";
import { ListItem, ListTitle } from "../components/ListItem";
import { SimListItem, SimListTitle } from "../components/SimListItem";
import { TabletListItem, TabletListTitle } from "../components/TabletListItem";
import { SimStatusBadges } from "../components/SimStatusBadges";

const { Search } = Input;

const REQUEST_TIMEOUT = 30000;
const STORAGE_KEY = 'unifiedSearchState';

export default function UnifiedSearch() {
    const { tokens } = useAuth();
    const [messageApi, contextHolder] = message.useMessage();
    const key = 'updatable';
    const navigate = useNavigate();
    const query = useQuery();

    const [inputValue, setInputValue] = useState('');
    const [wearerItems, setWearerItems] = useState([]);
    const [simItems, setSimItems] = useState([]);
    const [tabletItems, setTabletItems] = useState([]);
    const [watchSim, setWatchSim] = useState(null);
    const [tabletSim, setTabletSim] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Identifica la búsqueda en curso: las respuestas de una búsqueda anterior
    // se descartan en vez de sobrescribir los resultados de la actual.
    const searchIdRef = useRef(0);
    // Evita relanzar la búsqueda del query param en cada render.
    const lastQuerySearchRef = useRef(null);
    // Una búsqueda puede terminar cuando el usuario ya abrió un resultado: sus
    // avisos no deben aparecer encima de la pantalla de detalle.
    const isMountedRef = useRef(true);

    useEffect(() => {
        // Se reasigna al montar por el doble montaje de StrictMode en desarrollo.
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!tokens || !checkAuth(tokens)) {
            navigate('/login');
        }
    }, [tokens, navigate]);

    useEffect(() => {
        // When the component mounts, load the table state from sessionStorage
        const savedState = sessionStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            setWearerItems(parsed.wearerItems || []);
            setSimItems(parsed.simItems || []);
            setTabletItems(parsed.tabletItems || []);
            setWatchSim(parsed.watchSim || null);
            setTabletSim(parsed.tabletSim || null);
        }
    }, []);

    useEffect(() => {
        // When the results change, save them to sessionStorage
        if (wearerItems.length > 0 || simItems.length > 0 || tabletItems.length > 0 || watchSim || tabletSim) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                wearerItems,
                simItems,
                tabletItems,
                watchSim,
                tabletSim,
            }));
        }
    }, [wearerItems, simItems, tabletItems, watchSim, tabletSim]);

    const handleWearerClick = (deviceId, imei) => {
        const routeParam = deviceId ? `?deviceId=${deviceId}` : `?imei=${imei}`;
        navigate(`/wearer${routeParam}`, { state: { imei } });
    };

    const handleSimClick = (subObjectId, iccId, imei, instance) => {
        let routeParam = '';

        if (subObjectId) {
            routeParam += `?subObjectId=${subObjectId}`;
        } else if (iccId) {
            routeParam += `?iccId=${iccId}`;
        } else if (imei) {
            routeParam += `?imei=${imei}`;
        }

        navigate(`/sim/dashboard${routeParam}`, {
            state: {
                subObjectId,
                iccId,
                imei,
                deviceType: instance // 'watch' o 'tablet'
            }
        });
    };

    const handleTabletClick = (hid, objectId) => {
        // El dashboard prioriza el hid, y un 'hid=undefined' lo mandaría al 404.
        const params = new URLSearchParams();
        if (hid) params.set('hid', hid);
        if (objectId) params.set('objectId', objectId);
        navigate(`/tablet/dashboard?${params.toString()}`);
    };

    const cleanTable = () => {
        setWearerItems([]);
        setSimItems([]);
        setTabletItems([]);
        setWatchSim(null);
        setTabletSim(null);
        setHasSearched(false);
        sessionStorage.removeItem(STORAGE_KEY);
    };

    const isUnauthorized = (result) =>
        result.status === 'rejected' && result.reason?.response?.status === 401;

    const onSearch = async (value) => {
        if (!value || !value.trim()) return;

        const searchId = ++searchIdRef.current;
        const isCurrent = () => isMountedRef.current && searchIdRef.current === searchId;

        setIsSearching(true);
        setHasSearched(true);
        setWearerItems([]);
        setSimItems([]);
        setTabletItems([]);
        setWatchSim(null);
        setTabletSim(null);
        // Si la búsqueda falla, no deben quedar los resultados de la anterior.
        sessionStorage.removeItem(STORAGE_KEY);

        messageApi.open({
            key,
            type: 'loading',
            content: 'Buscando...',
        });

        // Las peticiones no tardan lo mismo, así que el aviso de carga se cierra
        // con los primeros resultados en vez de esperar a la más lenta.
        let loadingDismissed = false;
        const dismissLoading = () => {
            if (loadingDismissed || !isCurrent()) return;
            loadingDismissed = true;
            messageApi.destroy(key);
        };

        const request = (path) => axios.get(
            process.env.REACT_APP_BACKEND_HOST + path,
            {
                params: { queryStr: value },
                headers: { Authorization: `Bearer ${tokens.AccessToken}` },
                timeout: REQUEST_TIMEOUT
            }
        );

        // Cada llamada pinta sus resultados apenas llega, sin esperar a las otras.
        const wearerRequest = request('/wearer/getWearerByString').then((response) => {
            const items = response.data?.data || [];
            if (isCurrent()) setWearerItems(items);
            if (items.length > 0) dismissLoading();
            return items;
        });

        const watchSimRequest = request('/sim/searchSims').then((response) => {
            const data = response.data?.data || {};
            const subs = (data.subResults || []).map(result => ({ ...result, instance: 'watch' }));
            const looseSim = data.simResults?.[0]?.iccId || null;
            if (isCurrent()) {
                setSimItems(prev => [...subs, ...prev]);
                setWatchSim(looseSim);
            }
            if (subs.length > 0) dismissLoading();
            return { subs, looseSim };
        });

        const tabletSimRequest = request('/tabletSim/searchTabletSims').then((response) => {
            const data = response.data?.data || {};
            const subs = data.subResults || [];
            const looseSim = data.simResults?.[0]?.iccId || null;
            if (isCurrent()) {
                setSimItems(prev => [...prev, ...subs]);
                setTabletSim(looseSim);
            }
            if (subs.length > 0) dismissLoading();
            return { subs, looseSim };
        });

        const tabletRequest = request('/tablet/searchTablets').then((response) => {
            const items = response.data?.data || [];
            if (isCurrent()) setTabletItems(items);
            if (items.length > 0) dismissLoading();
            return items;
        });

        const results = await Promise.allSettled([wearerRequest, watchSimRequest, tabletSimRequest, tabletRequest]);

        if (!isCurrent()) return;
        setIsSearching(false);

        if (results.some(isUnauthorized)) {
            messageApi.open({
                key,
                type: 'error',
                content: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
                duration: 4,
            });
            navigate('/login');
            return;
        }

        const failed = results.filter(result => result.status === 'rejected');
        const [wearerResult, watchResult, tabletSimResult, tabletResult] = results;

        const wearerCount = wearerResult.status === 'fulfilled' ? wearerResult.value.length : 0;
        const simCount = [watchResult, tabletSimResult]
            .reduce((total, result) => total + (result.status === 'fulfilled' ? result.value.subs.length : 0), 0);
        const tabletCount = tabletResult.status === 'fulfilled' ? tabletResult.value.length : 0;
        const looseSimFound = [watchResult, tabletSimResult]
            .some(result => result.status === 'fulfilled' && result.value.looseSim);

        if (failed.length === results.length) {
            const timedOut = failed.some(result => result.reason?.code === 'ECONNABORTED');
            messageApi.open({
                key,
                type: 'error',
                content: timedOut
                    ? 'La búsqueda está tomando demasiado tiempo. Por favor, intente con un término más específico.'
                    : 'Error en la búsqueda',
                duration: 4,
            });
        } else if (wearerCount === 0 && simCount === 0 && tabletCount === 0) {
            messageApi.open({
                key,
                type: looseSimFound ? 'info' : 'warning',
                icon: null,
                content: looseSimFound
                    ? 'Se encontraron SIMs sin suscripciones.'
                    : 'No se encontraron resultados para la búsqueda.',
                duration: 3,
            });
        } else {
            // Los resultados ya están en pantalla con su contador por tabla.
            dismissLoading();
        }

        if (failed.length > 0 && failed.length < results.length) {
            messageApi.open({
                type: 'warning',
                content: 'Algunos resultados no pudieron cargarse. Reintente la búsqueda.',
                duration: 4,
            });
        }
    };

    useEffect(() => {
        const searchTxt = query.get('searchTxt');
        if (searchTxt && lastQuerySearchRef.current !== searchTxt) {
            lastQuerySearchRef.current = searchTxt;
            setInputValue(searchTxt);
            onSearch(searchTxt);
            // Se limpia al lanzar la búsqueda y no al terminarla: onSearch tarda
            // segundos, y para entonces el usuario ya puede estar en un detalle.
            navigate('/', { replace: true });
        }
    }, [query]);

    const hasResults = wearerItems.length > 0 || simItems.length > 0 || tabletItems.length > 0;

    return (
      <MainLayout currentView="search">
        <>
          {contextHolder}
          <div style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 20,
                justifyContent: "center",
              }}
            >
              <Search
                placeholder="Buscar"
                onSearch={onSearch}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                loading={isSearching}
                style={{
                  width: 500,
                  padding: 5,
                  display: "flex",
                  alignItems: "center",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  marginLeft: "15px",
                }}
              >
                {(watchSim || tabletSim) && (
                  <SimStatusBadges
                    watchSim={watchSim}
                    tabletSim={tabletSim}
                    searched={true}
                  />
                )}

                {(hasResults || watchSim || tabletSim) && (
                  <Button
                    type="danger"
                    onClick={cleanTable}
                    style={{ backgroundColor: "#F93C7C", color: "white" }}
                  >
                    Limpiar Tabla
                  </Button>
                )}
              </div>
            </div>

            {/* Tabla de relojes */}
            {wearerItems.length > 0 && (
              <div style={{ marginBottom: 30 }}>
                <p style={sectionTitleStyle}>Relojes ({wearerItems.length})</p>
                <ListTitle />
                <div className="list">
                  {wearerItems.map((item, index) => (
                    <ListItem
                      key={index}
                      objectId={item.objectId}
                      deviceId={item.deviceId}
                      firstName={item.firstName}
                      lastName={item.lastName}
                      imei={item.imei}
                      phone={item.phone}
                      handleClick={() => handleWearerClick(item.deviceId, item.imei)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tabla de suscripciones */}
            {simItems.length > 0 && (
              <div>
                <p style={sectionTitleStyle}>Suscripciones SIM ({simItems.length})</p>
                <SimListTitle />
                <div className="list">
                  {simItems.map((item, index) => (
                    <SimListItem
                      key={index}
                      iccId={item.iccId}
                      name={item.subscriber?.name}
                      msisdn={item.msisdn}
                      lastname={item.subscriber?.lastname}
                      phone={item.subscriber?.phone}
                      status={item.status}
                      instance={item.instance}
                      handleClick={() =>
                        handleSimClick(
                          item.objectId,
                          item.iccId,
                          item.imei,
                          item.instance
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tabla de tablets */}
            {tabletItems.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <p style={sectionTitleStyle}>Tablets ({tabletItems.length})</p>
                <TabletListTitle />
                <div className="list">
                  {tabletItems.map((item) => (
                    <TabletListItem
                      key={item.objectId}
                      objectId={item.objectId}
                      hid={item.hid}
                      profileName={item.profileName}
                      recoveryEmail={item.recoveryEmail}
                      hardwareModel={item.hardwareModel}
                      handleClick={() => handleTabletClick(item.hid, item.objectId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {hasSearched && !isSearching && !hasResults && (
              <div style={emptyStateStyle}>
                {watchSim || tabletSim
                  ? "No se encontraron suscripciones."
                  : "No se encontraron resultados."}
              </div>
            )}

            {!hasResults && !isSearching && (
              <div style={guideStyle}>
                <p style={guideIntroStyle}>La búsqueda acepta cualquiera de estos datos:</p>
                <div style={guideGridStyle}>
                  {SEARCH_CRITERIA.map((group) => (
                    <div key={group.title} style={guideCardStyle}>
                      <p style={guideTitleStyle}>{group.title}</p>
                      <ul style={guideListStyle}>
                        {group.fields.map((field) => (
                          <li key={field} style={guideItemStyle}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      </MainLayout>
    );
}

const SEARCH_CRITERIA = [
    {
        title: 'Relojes',
        fields: ['IMEI', 'Device ID', 'Object ID', 'N° de teléfono'],
    },
    {
        title: 'SIM',
        fields: ['ICCID', 'Número SIM', 'Nombre o apellido', 'N° del suscriptor'],
    },
    {
        title: 'Tablets',
        fields: ['HID', 'Object ID', 'Email de recuperación', 'Nombre de perfil'],
    },
];

const guideStyle = {
    marginTop: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
};

const guideIntroStyle = {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
};

const guideGridStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
};

const guideCardStyle = {
    background: "#fff",
    border: "1px solid #efe9fb",
    borderRadius: 12,
    padding: "16px 24px",
    minWidth: 200,
    textAlign: "left",
};

const guideTitleStyle = {
    fontWeight: 600,
    fontSize: 14,
    color: "#603BB0",
    marginBottom: 8,
};

const guideListStyle = {
    listStyle: "none",
    padding: 0,
    margin: 0,
};

const guideItemStyle = {
    fontSize: 13,
    color: "#666",
    lineHeight: 1.9,
};

const sectionTitleStyle = {
    textAlign: "left",
    fontWeight: 600,
    fontSize: 15,
    color: "#603BB0",
    marginBottom: 8,
    paddingLeft: 4,
};

const emptyStateStyle = {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#888",
};
