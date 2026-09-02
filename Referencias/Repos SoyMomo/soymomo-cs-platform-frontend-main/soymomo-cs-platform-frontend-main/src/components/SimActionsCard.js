import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Input, Space, Select } from 'antd';
import { useAuth } from "../authContext";
import styles from "../styles/SimActionsCard.module.css"
import sharedStyles from "../styles/Common.module.css"
import { FaChevronRight } from "react-icons/fa";


const APIO_PLANS = [
    { objectId: 'ohVnX3kw64', name: 'SoyMomo SIM Lite',  price: 7990 },
    { objectId: '2bqVCQIRik', name: 'SoyMomo SIM',       price: 9990 },
    { objectId: '8PE3HOn5uj', name: 'SoyMomo SIM PLUS',  price: 14990 },
];

export default function SimActionsCard(props) {
    const [subTerminated, setSubTerminated] = useState(false);
    const [toggleTransferSimModal, setToggleTransferSimModal] = useState(false);
    const [toggleTransferWatchModal, setToggleTransferWatchModal] = useState(false);
    const [toggleUpgradePlanModal, setToggleUpgradePlanModal] = useState(false);
    const [toggleTerminateModal, setToggleTerminateModal] = useState(false);
    const [cancelSubExpl, setCancelSubExpl] = useState('');
    const [newIccId, setNewIccId] = useState('');
    const [newWatchImei, setNewWatchImei] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const { tokens } = useAuth();

    const { TextArea } = Input;

    const {
        openMessageApi,
        simCard,
        handleSIMRefresh
    } = props

    const {
        iccId,
        subscriptionId,
        parseObjectId,
        plan,
        apioCredentials,
        state = '',
    } = simCard || {}

    // parseObjectId es siempre el objectId de Parse; subscriptionId puede ser
    // el ID del proveedor externo (Alai/Gigs) en algunas rutas de carga
    const parseSubId = parseObjectId || subscriptionId;

    const currentApioMonthlyPlan = APIO_PLANS.find(p => p.objectId === plan?.objectId);
    const upgradePlans = currentApioMonthlyPlan
        ? APIO_PLANS.filter(p => p.price > currentApioMonthlyPlan.price)
        : [];
    const isApio = !!apioCredentials;
    const canUpgradePlan = isApio && !!currentApioMonthlyPlan;

    const leftIcon = '/images/cs-comands.svg';
    const leftIconHeight = 24;
    const leftIconWidth = 24;

    useEffect(() => {
        // Solo una suscripción TERMINATED bloquea la cancelación;
        // una SUSPENDED todavía se puede cancelar
        setSubTerminated(state === 'TERMINATED');
    }, [state]);

    const showTerminateModal = () => {
        setToggleTerminateModal(true)
    }

    const handleTerminateOk = () => {
        handleTerminateSub()
        setToggleTerminateModal(false)
    }

    const handleTerminateCancel = () => {
        setToggleTerminateModal(false)
    }


    async function handleTerminateSub() {
        try {
            openMessageApi('Loading...', 'loading');
            if (!iccId) {
                openMessageApi('iccId inexistente', 'error')
            } else {
                const terminatePayload = { iccId, reason: cancelSubExpl }
                const response = await axios.put(
                    process.env.REACT_APP_BACKEND_HOST + '/subscription/terminate',
                    terminatePayload,
                    {
                        headers:
                            { Authorization: `Bearer ${tokens.AccessToken}` }
                    }
                );
                if (response.status === 201) {
                    setSubTerminated(true)
                    handleSIMRefresh()
                    openMessageApi('Success!', 'success');
                } else {
                    openMessageApi(response.data?.message || 'Error desconocido', 'error')
                }
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error desconocido';
            openMessageApi(errorMessage, 'error');
        }
    }
  
    const handleChangeCancelExpl = (e) => {
        setCancelSubExpl(e.target.value)
    }

    const handleNewIccIdChange = async (e) => {
        setNewIccId(e.target.value)
    }

    async function onTransferToNewSims() {
        if (newIccId.length < 20 || newIccId.length > 20) {
            openMessageApi('Ingrese un IccId válido', 'error')
            return;
        }

        if (newIccId === iccId) {
            openMessageApi('El IccId de la nueva SIM no puede ser igual al actual', 'error')
            return;
        }
        setToggleTransferSimModal(true)
    }

    async function handleTransferSimOk() {
        try {
            openMessageApi('Loading...', 'loading');
            const transferPayload = { currentIccId: iccId, newIccId }
            const response = await axios.put(
                process.env.REACT_APP_BACKEND_HOST + '/subscription/transferToNewSim',
                transferPayload,
                {
                    headers:
                        { Authorization: `Bearer ${tokens.AccessToken}` }
                }
            );
            if (response.status === 200) {
                openMessageApi('Success!', 'success');
                handleSIMRefresh();
            } else {
                openMessageApi(`${response.message}`, 'error')
            }
        } catch (error) {
            openMessageApi(`${error.message}`, 'error')
        }
        setToggleTransferSimModal(false)
    }

    async function handleTransferSimCancel() {
        setToggleTransferSimModal(false)
    }

    const handleNewWatchImeiChange = (e) => {
        setNewWatchImei(e.target.value)
    }

    async function onTransferToNewWatch() {
        if (!newWatchImei) {
            openMessageApi('Ingrese un IMEI válido', 'error')
            return;
        }
        setToggleTransferWatchModal(true)
    }

    async function handleTransferWatchOk() {
        try {
            openMessageApi('Loading...', 'loading');
            const response = await axios.put(
                process.env.REACT_APP_BACKEND_HOST + '/subscription/changeWatch',
                { subscriptionId: parseSubId, imei: newWatchImei },
                { headers: { Authorization: `Bearer ${tokens.AccessToken}` } }
            );
            if (response.status === 200) {
                openMessageApi('Success!', 'success');
                handleSIMRefresh();
            } else {
                openMessageApi(response.data?.message || 'Error desconocido', 'error')
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error desconocido';
            openMessageApi(errorMessage, 'error');
        }
        setToggleTransferWatchModal(false)
    }

    async function handleTransferWatchCancel() {
        setToggleTransferWatchModal(false)
    }

    async function handleUpgradePlanOk() {
        try {
            openMessageApi('Loading...', 'loading');
            const response = await axios.put(
                process.env.REACT_APP_BACKEND_HOST + '/subscription/changeApioPlan',
                { iccId, targetPlanId: selectedPlanId },
                { headers: { Authorization: `Bearer ${tokens.AccessToken}` } }
            );
            if (response.status === 200) {
                openMessageApi('Plan actualizado con éxito!', 'success');
                handleSIMRefresh();
            } else {
                openMessageApi(response.data?.message || 'Error desconocido', 'error')
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error desconocido';
            openMessageApi(errorMessage, 'error');
        }
        setToggleUpgradePlanModal(false)
    }

    function handleUpgradePlanCancel() {
        setToggleUpgradePlanModal(false)
    }

    return (
        <div className={styles.generalContainer}>
            <div className={sharedStyles.generalCard}>
                <div className={sharedStyles.cardSubContainer}>
                    <div className={sharedStyles.flexCenter}>
                        <div className={sharedStyles.iconContainer}>
                            <img src={leftIcon} width={leftIconWidth} height={leftIconHeight} alt='SoyMomo Logo' />
                        </div>
                        <div className={sharedStyles.flexAndCol}>
                            <h1 className={sharedStyles.iconTitle}>Comandos Suscripción</h1>
                            <p className={sharedStyles.iconSubTitle}>Ejecutar</p>
                        </div>
                    </div>
                </div>
                <div className={sharedStyles.metaData}>
                    <h3 className={styles.comandTitle2}><strong>Transferir Suscripción</strong></h3>
                    <p className={styles.actionSubTitle}>Transfiere la suscripción a otra SIM</p>
                    <Space.Compact className={styles.inputContainer}>
                        <input placeholder="Ingrese el IccId de la nueva suscripción" onChange={handleNewIccIdChange} value={newIccId} onKeyDown={(e) => e.key === 'Enter' && onTransferToNewSims()} className={styles.textBox} />
                        <div className={styles.space} />
                        <div className={styles.sendIcon}><FaChevronRight onClick={onTransferToNewSims} /></div>
                    </Space.Compact>

                    <Modal
                        title="Transferir Suscripción"
                        open={toggleTransferSimModal}
                        onOk={handleTransferSimOk}
                        onCancel={handleTransferSimCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        Estás seguro/a que quieres transferir la suscripción a una nueva SIM?
                        Desde: {iccId} Hacia: {newIccId}
                    </Modal>

                    <h3 className={styles.comandTitle2}><strong>Transferir Reloj</strong></h3>
                    <p className={styles.actionSubTitle}>Transfiere la suscripción a otro reloj</p>
                    <Space.Compact className={styles.inputContainer}>
                        <input placeholder="Ingrese el IMEI del reloj destino" onChange={handleNewWatchImeiChange} value={newWatchImei} onKeyDown={(e) => e.key === 'Enter' && onTransferToNewWatch()} className={styles.textBox} />
                        <div className={styles.space} />
                        <div className={styles.sendIcon}><FaChevronRight onClick={onTransferToNewWatch} /></div>
                    </Space.Compact>

                    <Modal
                        title="Transferir Reloj"
                        open={toggleTransferWatchModal}
                        onOk={handleTransferWatchOk}
                        onCancel={handleTransferWatchCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres transferir la suscripción a otro reloj?
                        <br />
                        IMEI destino: <strong>{newWatchImei}</strong>
                    </Modal>

                    {canUpgradePlan && (
                        <>
                            <h3 className={styles.comandTitle2}><strong>Mejorar Plan</strong></h3>
                            <p className={styles.actionSubTitle}>Upgrade de plan Apio (solo mensual)</p>
                            {upgradePlans.length > 0 ? (
                                <Space.Compact className={styles.inputContainer}>
                                    <Select
                                        placeholder={<span style={{ textAlign: 'left', display: 'block', color: '#9ca3af', fontWeight: 400 }}>Selecciona un plan</span>}
                                        value={selectedPlanId || undefined}
                                        onChange={(value) => setSelectedPlanId(value)}
                                        style={{ flex: 1, textAlign: 'left' }}
                                        options={upgradePlans.map(p => ({
                                            value: p.objectId,
                                            label: (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                    <span style={{ color: '#603BB0', fontWeight: 700 }}>${p.price.toLocaleString('es-CL')}</span>
                                                </div>
                                            ),
                                        }))}
                                    />
                                    <div className={styles.space} />
                                    <div className={styles.sendIcon}>
                                        <FaChevronRight onClick={() => {
                                            if (!selectedPlanId) {
                                                openMessageApi('Selecciona un plan', 'error');
                                                return;
                                            }
                                            setToggleUpgradePlanModal(true);
                                        }} />
                                    </div>
                                </Space.Compact>
                            ) : (
                                <p className={styles.actionSubTitle}>Ya está en el plan más alto disponible</p>
                            )}

                            <Modal
                                title="Mejorar Plan"
                                open={toggleUpgradePlanModal}
                                onOk={handleUpgradePlanOk}
                                onCancel={handleUpgradePlanCancel}
                                okButtonProps={{ className: styles.okBtn }}
                                cancelButtonProps={{ className: styles.cancelBtn }}
                                className="my-custom-modal-class"
                            >
                                ¿Estás seguro/a que quieres cambiar al plan <strong>{APIO_PLANS.find(p => p.objectId === selectedPlanId)?.name}</strong>?
                                <br />
                                Esta acción cambiará el plan de facturación mensual.
                            </Modal>
                        </>
                    )}

                    <div className='mt-8 mb-6 flex flex-col items-center'>
                        <div className='flex w-full space-x-4'>
                            <button disabled={subTerminated} onClick={showTerminateModal} className={styles.shutDownBtn}><strong>Cancelar</strong></button>
                    
                        </div>
                    </div>


                    <Modal
                        title="Cancelar Suscripción"
                        open={toggleTerminateModal}
                        onOk={handleTerminateOk}
                        onCancel={handleTerminateCancel}
                        okButtonProps={{
                            className: styles.okBtn,
                            disabled: !cancelSubExpl
                        }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        Estás seguro/a que quieres cancelar la suscripción? Esta acción no se puede deshacer.
                        <br />
                        Escribe una justificación de la cancelación:
                        <TextArea
                            rows={4}
                            placeholder="Justificación de la cancelación"
                            onChange={handleChangeCancelExpl}
                            value={cancelSubExpl}
                            className={styles.textArea}
                        />
                    </Modal>
                    
                </div>
            </div>
        </div>
    )
}

