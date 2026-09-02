import React, { useState } from 'react';
import axios from 'axios';
import { Space, Modal } from 'antd';
import { useAuth } from "../authContext";
import { useNavigate } from 'react-router-dom';
import styles from "../styles/Commands.module.css"
import sharedStyles from "../styles/Common.module.css"
import { FaChevronRight } from "react-icons/fa";


export default function ComandsComponent(props) {

   
    const [message, setMessage] = useState('')
    const [newDeviceId, setNewDeviceId] = useState('')

    const [toggleResetModal, setToggleResetModal] = useState(false);
    const [toggleShutdownModal, setToggleShutdownModal] = useState(false);
    const [toggleFindModal, setToggleFindModal] = useState(false);
    const [toggleFactoryModal, setToggleFactoryModal] = useState(false);
    const [toggleChargeSettingsModal, setToggleChargeSettingsModal] = useState(false);
    const [toggleChargeContactsModal, setToggleChargeContactsModal] = useState(false);

    const [toggleSwapModal, setToggleSwapModal] = useState(false);
    const [swapInProgress, setSwapInProgress] = useState(false);
  
    const { tokens } = useAuth();
    const navigate = useNavigate();
    
    const {
        openMessageApi,
        imei,
        leftIcon,
        leftIconWidth,
        leftIconHeight,
        title,
        subtitle,
        resetWatch,
        watchInfo,
        hardwareModel,
        buildInfoId
    } = props

    // Función para mostrar mensajes de error con toast personalizado
    const showErrorMessage = (message, type) => {
        // Crear toast personalizado
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4d4f' : '#52c41a'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        toast.textContent = message;
        
        // Agregar al DOM
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Remover después de 4 segundos
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    };

    let { deviceId = '' } = props

    //Reset
    const showResetModal = () => {
        setToggleResetModal(true)
    }

    const handleResetOk = () => {
        resetWatch(deviceId, imei);
        setToggleResetModal(false)
    }

    const handleResetCancel = () => {
        setToggleResetModal(false)
    }

    //Shutdown
    const showShutdownModal = () => {
        setToggleShutdownModal(true)
    }

    const handleShutdownOk = () => {
        shutDown()
        setToggleShutdownModal(false)
    }

    const handleShutdownCancel = () => {
        setToggleShutdownModal(false)
    }

    //Find
    const showFindModal = () => {
        setToggleFindModal(true)
    }

    const handleFindOk = () => {
        find()
        setToggleFindModal(false)
    }

    const handleFindCancel = () => {
        setToggleFindModal(false)
    }
    //Factory
    const showFactoryModal = () => {
        setToggleFactoryModal(true)
    }

    const handleFactoryOk = () => {
        factory()
        setToggleFactoryModal(false)
    }

    const handleFactoryCancel = () => {
        setToggleFactoryModal(false)
}
    //ChargeSettings
    const showChargeSettingsModal = () => {
        setToggleChargeSettingsModal(true)
    }

    const handleChargeSettingsOk = () => {
        chargeSettings()
        setToggleChargeSettingsModal(false)
    }

    const handleChargeSettingsCancel = () => {
        setToggleChargeSettingsModal(false)
    }
    //ChargeContacts
       const showChargeContactsModal = () => {
        setToggleChargeContactsModal(true)
    }

    const handleChargeContactsOk = () => {
        chargeContacts()
        setToggleChargeContactsModal(false)
    }

    const handleChargeContactsCancel = () => {
        setToggleChargeContactsModal(false)
    }
        //Change
    const handleChange = (event) => {
        setMessage(event.target.value);
    }

    const handleDeviceIdChange = (event) => {
        setNewDeviceId(event.target.value);
    }

 
    async function onSendMessage() {
        // console.log('success');
        // return;
        // setSendLoading(true);
        if (!deviceId && imei) {
            deviceId = imei.slice(4, 14);
        }
        if (message !== "") {
            await axios.post(process.env.REACT_APP_BACKEND_HOST + '/wearer/sendMessageToWearer', { message, deviceId }, { headers: { Authorization: `Bearer ${tokens.AccessToken}` } });
        }
        // setSendLoading(false);
    }

    async function shutDown() {
        openMessageApi('Loading...', 'loading')
        try {
            if (!deviceId && imei) {
                deviceId = imei.slice(4, 14);
            }
            const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/wearer/powerOff', { deviceId }, { headers: { Authorization: `Bearer ${tokens.AccessToken}` } });

            if (response.status === 200) {
                openMessageApi('Success!', 'success')
            } else {
                openMessageApi(`Error ${response.status}: ${response.data.message}`, 'error')
            }
        } catch (error) {
            openMessageApi(`Error: ${error.message}`, 'error')
        }
    }

    async function find() {
        openMessageApi('Loading...', 'loading')
        try {
            if (!deviceId && imei) {
                deviceId = imei.slice(4, 14);
            }
            const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/wearer/find', { deviceId }, { headers: { Authorization: `Bearer ${tokens.AccessToken}` } });

            if (response.status === 200) {
                openMessageApi('Success!', 'success')
            } else {
                openMessageApi(`Error ${response.status}: ${response.data.message}`, 'error')
            }
        } catch (error) {
            openMessageApi(`Error: ${error.message}`, 'error')
        }
    }

    async function factory() {
        openMessageApi('Loading...', 'loading')
        try {
            if (!deviceId && imei) {
                deviceId = imei.slice(4, 14);
            }
            const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/wearer/factory', { deviceId }, { headers: { Authorization: `Bearer ${tokens.AccessToken}` } });

            if (response.status === 200) {
                openMessageApi('Success!', 'success')
            } else {
                openMessageApi(`Error ${response.status}: ${response.data.message}`, 'error')
            }
        } catch (error) {
            openMessageApi(`Error: ${error.message}`, 'error')
        }
    }

    async function chargeSettings() {
        openMessageApi('Loading...', 'loading')
        try {
            if (!deviceId && imei) {
                deviceId = imei.slice(4, 14);
            }
            const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/wearer/chargeSettings', { deviceId }, { headers: { Authorization: `Bearer ${tokens.AccessToken}` } });

            if (response.status === 200) {
                openMessageApi('Success!', 'success')
            } else {
                openMessageApi(`Error ${response.status}: ${response.data.message}`, 'error')
            }
        } catch (error) {
            openMessageApi(`Error: ${error.message}`, 'error')
        }
    }

    async function chargeContacts() {
        openMessageApi('Loading...', 'loading')
        try {
            if (!deviceId && imei) {
                deviceId = imei.slice(4, 14);
            }
            const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/wearer/chargeContacts', { deviceId }, { headers: { Authorization: `Bearer ${tokens.AccessToken}` } });

            if (response.status === 200) {
                openMessageApi('Success!', 'success')
            } else {
                openMessageApi(`Error ${response.status}: ${response.data.message}`, 'error')
            }
        } catch (error) {
            openMessageApi(`Error: ${error.message}`, 'error')
        }
    }

    async function onSwapWearers() {
        if (!deviceId && imei) {
            deviceId = imei.slice(4, 14);
        }
        if (deviceId.length !== 10) {
            showErrorMessage('Error al obtener el deviceId actual', 'error')
            return;
        }
        if (newDeviceId.length === 15) {
            showErrorMessage('Por favor ingrese el deviceId de 10 dígitos, no el IMEI completo', 'error')
            return;
        } else if (newDeviceId.length !== 10) {
            showErrorMessage('El nuevo deviceId debe tener 10 números', 'error')
            return;
        } else if (newDeviceId === deviceId) {
            showErrorMessage('El nuevo deviceId debe ser diferente al actual', 'error')
            return;
        } else if (isNaN(newDeviceId)) {
            showErrorMessage('El nuevo deviceId debe ser numérico', 'error')
            return;
        }
        setSwapInProgress(false); // Asegurar que el flag esté limpio
        setToggleSwapModal(true)
    }

    async function handleSwapOk() {
        // Prevenir doble clic
        if (swapInProgress) return;
        
        // Marcar inmediatamente que el proceso ha comenzado
        setSwapInProgress(true);
        
        try {
            // Realizar la transferencia
            await axios.put(process.env.REACT_APP_BACKEND_HOST + '/wearer/swapWearers', { newDeviceId, deviceId }, { headers: { Authorization: `Bearer ${tokens.AccessToken}` } });
            
            // Buscar información del nuevo dispositivo
            const searchResponse = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/getWearerByString', { 
                params: { queryStr: newDeviceId }, 
                headers: { Authorization: `Bearer ${tokens.AccessToken}` } 
            });
            
            if (searchResponse.data && searchResponse.data.data && searchResponse.data.data.length > 0) {
                const newDevice = searchResponse.data.data[0];
                const newImei = newDevice.imei;
                
                // Navegar directamente al nuevo dispositivo
                const routeParam = newDeviceId ? `?deviceId=${newDeviceId}` : `?imei=${newImei}`;
                navigate(`/wearer${routeParam}`, { state: { imei: newImei } });
                
                showErrorMessage('Transferencia exitosa! Redirigiendo...', 'success');
            } else {
                showErrorMessage('Transferencia exitosa! Dispositivo no encontrado en búsqueda.', 'success');
            }
        } catch (error) {
            showErrorMessage(`Error: ${error.message}`, 'error');
        } finally {
            setToggleSwapModal(false);
            // Resetear el flag después de un pequeño delay
            setTimeout(() => {
                setSwapInProgress(false);
            }, 1000);
        }
    }

    async function handleSwapCancel() {
        setSwapInProgress(false); // Resetear el flag al cancelar
        setToggleSwapModal(false)
    }

    if (!hardwareModel || ((hardwareModel === "Soymomo_Space_v3" || hardwareModel === "Soymomo_Space_v4") && !buildInfoId)) {
        return (
            
        <div className={sharedStyles.generalCard}>
        <div className={sharedStyles.cardSubContainer}>
            <div className={sharedStyles.flexCenter}>
                <div className={sharedStyles.iconContainer}>
                    <img src={leftIcon} width={leftIconWidth} height={leftIconHeight} alt='SoyMomo Logo' />
                </div>
                <div className={sharedStyles.flexAndCol}>
                    <h1 className={sharedStyles.iconTitle}>{title}</h1>
                    <p className={sharedStyles.iconSubTitle}>{subtitle}</p>
                </div>
            </div>
        </div>
        <div className={sharedStyles.metaData}>

            <h3 className={styles.comandTitle2}><strong>Transferir reloj</strong></h3>
            <Space.Compact className={styles.inputContainer}>
                {/* eslint-disable-next-line react/no-unknown-property */}
                <input placeholder="Ingrese el deviceId" onChange={handleDeviceIdChange} value={newDeviceId} onKeyDown={(e) => e.key === 'Enter' && onSwapWearers()} className={styles.textBox} />
                <div className={styles.space} />
                <div className={styles.sendIcon}><FaChevronRight onClick={onSwapWearers} /></div>
            </Space.Compact>

            <Modal
                title="Transferir Reloj"
                open={toggleSwapModal}
                onOk={swapInProgress ? undefined : handleSwapOk}
                onCancel={swapInProgress ? undefined : handleSwapCancel}
                okButtonProps={{ 
                    className: styles.okBtn, 
                    disabled: swapInProgress,
                    children: swapInProgress ? 'Procesando...' : 'OK'
                }}
                cancelButtonProps={{ 
                    className: styles.cancelBtn, 
                    disabled: swapInProgress,
                    children: swapInProgress ? 'Procesando...' : 'Cancelar'
                }}
                className="my-custom-modal-class"
            >
                Estás seguro/a que quieres transferir el reloj a otro dispotivo nuevo?
                Desde: {deviceId} Hacia: {newDeviceId}
            </Modal>

            <h3 className={styles.comandTitle2}><strong>Enviar mensaje</strong></h3>
            <Space.Compact className={styles.inputContainer}>
                {/* eslint-disable-next-line react/no-unknown-property */}
                <input placeholder="Ingrese mensaje a enviar" onChange={handleChange} value={message} onKeyDown={(e) => e.key === 'Enter' && onSendMessage()} className={styles.textBox} />
                <div className={styles.space} />
                <div className={styles.sendIcon}><FaChevronRight onClick={onSendMessage} /></div>
            </Space.Compact>
            <Modal
                title="Resetear Reloj"
                open={toggleResetModal}
                onOk={handleResetOk}
                onCancel={handleResetCancel}
                okButtonProps={{ className: styles.okBtn }}
                cancelButtonProps={{ className: styles.cancelBtn }}
                className="my-custom-modal-class"
            >
                ¿Estás seguro/a que quieres resetear el reloj a sus configuraciones de fábrica?
                Se borrarán los siguientes datos y más:
                <ul>
                    <li>Usuarios vinculados: {watchInfo.users}</li>
                    <li>Historial de mensajes: {watchInfo.userMessages + watchInfo.friendMessages} </li>
                    <li>Amigos: {watchInfo.friends} </li>
                    <li>Contactos: {watchInfo.contacts} </li>
                </ul>
            </Modal>
            <Modal
                title="Apagar Reloj"
                open={toggleShutdownModal}
                onOk={handleShutdownOk}
                onCancel={handleShutdownCancel}
                okButtonProps={{ className: styles.okBtn }}
                cancelButtonProps={{ className: styles.cancelBtn }}
                className="my-custom-modal-class"
            >
                ¿Estás seguro/a que quieres apagar el reloj?
            </Modal>
            <Modal
                title="Sonar"
                open={toggleFindModal}
                onOk={handleFindOk}
                onCancel={handleFindCancel}
                okButtonProps={{ className: styles.okBtn }}
                cancelButtonProps={{ className: styles.cancelBtn }}
                className="my-custom-modal-class"
            >
                ¿Estás seguro/a que quieres hacer sonar el reloj?
            </Modal>
            <Modal
                title="Factory"
                open={toggleFactoryModal}
                onOk={handleFactoryOk}
                onCancel={handleFactoryCancel}
                okButtonProps={{ className: styles.okBtn }}
                cancelButtonProps={{ className: styles.cancelBtn }}
                className="my-custom-modal-class"
            >
                ¿Estás seguro/a que quieres hacer un factory al reloj?
            </Modal>
            <Modal
                title="Cargar configuración"
                open={toggleChargeSettingsModal}
                onOk={handleChargeSettingsOk}
                onCancel={handleChargeSettingsCancel}
                okButtonProps={{ className: styles.okBtn }}
                cancelButtonProps={{ className: styles.cancelBtn }}
                className="my-custom-modal-class"
            >
                ¿Estás seguro/a que quieres hacer un cargar configuración al reloj?
            </Modal>
            <Modal
                title="Cargar contactos"
                open={toggleChargeContactsModal}
                onOk={handleChargeContactsOk}
                onCancel={handleChargeContactsCancel}
                okButtonProps={{ className: styles.okBtn }}
                cancelButtonProps={{ className: styles.cancelBtn }}
                className="my-custom-modal-class"
            >
                ¿Estás seguro/a que quieres hacer un cargar contactos al reloj?
            </Modal>
        </div>
    </div>
        )
    }

    if (buildInfoId === "OPM2.171019.012 dev-keys" && (hardwareModel === "Soymomo_Space_v3" || hardwareModel === "Soymomo_Space_v4")) {
        
        return (

            <div className={sharedStyles.generalCard}>
                <div className={sharedStyles.cardSubContainer}>
                    <div className={sharedStyles.flexCenter}>
                        <div className={sharedStyles.iconContainer}>
                            <img src={leftIcon} width={leftIconWidth} height={leftIconHeight} alt='SoyMomo Logo' />
                        </div>
                        <div className={sharedStyles.flexAndCol}>
                            <h1 className={sharedStyles.iconTitle}>{title}</h1>
                            <p className={sharedStyles.iconSubTitle}>{subtitle}</p>
                        </div>
                    </div>
                </div>
                <div className={sharedStyles.metaData}>
    
                    <h3 className={styles.comandTitle2}><strong>Transferir reloj</strong></h3>
                    <Space.Compact className={styles.inputContainer}>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <input placeholder="Ingrese el deviceId" onChange={handleDeviceIdChange} value={newDeviceId} onKeyDown={(e) => e.key === 'Enter' && onSwapWearers()} className={styles.textBox} />
                        <div className={styles.space} />
                        <div className={styles.sendIcon}><FaChevronRight onClick={onSwapWearers} /></div>
                    </Space.Compact>
    
                    <Modal
                        title="Transferir Reloj"
                        open={toggleSwapModal}
                        onOk={swapInProgress ? undefined : handleSwapOk}
                        onCancel={handleSwapCancel}
                        okButtonProps={{ 
                            className: styles.okBtn, 
                            disabled: swapInProgress,
                            children: swapInProgress ? 'Procesando...' : 'OK'
                        }}
                        cancelButtonProps={{ 
                            className: styles.cancelBtn, 
                            disabled: false,
                            children: 'Cancelar'
                        }}
                        className="my-custom-modal-class"
                    >
                        Estás seguro/a que quieres transferir el reloj a otro dispotivo nuevo?
                        Desde: {deviceId} Hacia: {newDeviceId}
                    </Modal>
    
                    <h3 className={styles.comandTitle2}><strong>Enviar mensaje</strong></h3>
                    <Space.Compact className={styles.inputContainer}>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <input placeholder="Ingrese mensaje a enviar" onChange={handleChange} value={message} onKeyDown={(e) => e.key === 'Enter' && onSendMessage()} className={styles.textBox} />
                        <div className={styles.space} />
                        <div className={styles.sendIcon}><FaChevronRight onClick={onSendMessage} /></div>
                    </Space.Compact>
    
                    {/* <Search loading={sendLoading} placeholder="Ingrese mensaje a enviar" onSearch={onSendMessage} enterButton="Enviar" className='bg-[#603BB0] hover:bg-[#3CB5C7] rounded-lg'/> */}
                    <div className={styles.btnContainer}>
                    <div className={styles.btnContainerChild}>
                        <button onClick={showFindModal} className={styles.regularBtn}><strong>Sonar</strong></button>
                    </div>
                    <div className={styles.btnContainerChild}>
                        <button onClick={showFactoryModal} className={styles.factoryBtn}><strong>Factory</strong></button>
                        <button onClick={showShutdownModal} className={styles.shutDownBtn}><strong>Apagar</strong></button>
                        <button onClick={showResetModal} className={styles.shutDownBtn}><strong>Resetear</strong></button>
                    </div>
                    </div>
                    <Modal
                        title="Resetear Reloj"
                        open={toggleResetModal}
                        onOk={handleResetOk}
                        onCancel={handleResetCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres resetear el reloj a sus configuraciones de fábrica?
                        Se borrarán los siguientes datos y más:
                        <ul>
                            <li>Usuarios vinculados: {watchInfo.users}</li>
                            <li>Historial de mensajes: {watchInfo.userMessages + watchInfo.friendMessages} </li>
                            <li>Amigos: {watchInfo.friends} </li>
                            <li>Contactos: {watchInfo.contacts} </li>
                        </ul>
                    </Modal>
                    <Modal
                        title="Apagar Reloj"
                        open={toggleShutdownModal}
                        onOk={handleShutdownOk}
                        onCancel={handleShutdownCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres apagar el reloj?
                    </Modal>
                    <Modal
                        title="Sonar"
                        open={toggleFindModal}
                        onOk={handleFindOk}
                        onCancel={handleFindCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres hacer sonar el reloj?
                    </Modal>
                    <Modal
                        title="Factory"
                        open={toggleFactoryModal}
                        onOk={handleFactoryOk}
                        onCancel={handleFactoryCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres hacer un factory al reloj?
                    </Modal>
                    <Modal
                        title="Cargar configuración"
                        open={toggleChargeSettingsModal}
                        onOk={handleChargeSettingsOk}
                        onCancel={handleChargeSettingsCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres hacer un cargar configuración al reloj?
                    </Modal>
                    <Modal
                        title="Cargar contactos"
                        open={toggleChargeContactsModal}
                        onOk={handleChargeContactsOk}
                        onCancel={handleChargeContactsCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres hacer un cargar contactos al reloj?
                    </Modal>
                </div>
            </div>
    
        )


    }

    else if (hardwareModel === "Soymomo_Space_v3" || hardwareModel === "Soymomo_Space_v4") {

        return (

            <div className={sharedStyles.generalCard}>
                <div className={sharedStyles.cardSubContainer}>
                    <div className={sharedStyles.flexCenter}>
                        <div className={sharedStyles.iconContainer}>
                            <img src={leftIcon} width={leftIconWidth} height={leftIconHeight} alt='SoyMomo Logo' />
                        </div>
                        <div className={sharedStyles.flexAndCol}>
                            <h1 className={sharedStyles.iconTitle}>{title}</h1>
                            <p className={sharedStyles.iconSubTitle}>{subtitle}</p>
                        </div>
                    </div>
                </div>
                <div className={sharedStyles.metaData}>
    
                    <h3 className={styles.comandTitle2}><strong>Transferir reloj</strong></h3>
                    <Space.Compact className={styles.inputContainer}>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <input placeholder="Ingrese el deviceId" onChange={handleDeviceIdChange} value={newDeviceId} onKeyDown={(e) => e.key === 'Enter' && onSwapWearers()} className={styles.textBox} />
                        <div className={styles.space} />
                        <div className={styles.sendIcon}><FaChevronRight onClick={onSwapWearers} /></div>
                    </Space.Compact>
    
                    <Modal
                        title="Transferir Reloj"
                        open={toggleSwapModal}
                        onOk={swapInProgress ? undefined : handleSwapOk}
                        onCancel={handleSwapCancel}
                        okButtonProps={{ 
                            className: styles.okBtn, 
                            disabled: swapInProgress,
                            children: swapInProgress ? 'Procesando...' : 'OK'
                        }}
                        cancelButtonProps={{ 
                            className: styles.cancelBtn, 
                            disabled: false,
                            children: 'Cancelar'
                        }}
                        className="my-custom-modal-class"
                    >
                        Estás seguro/a que quieres transferir el reloj a otro dispotivo nuevo?
                        Desde: {deviceId} Hacia: {newDeviceId}
                    </Modal>
    
                    <h3 className={styles.comandTitle2}><strong>Enviar mensaje</strong></h3>
                    <Space.Compact className={styles.inputContainer}>
                        {/* eslint-disable-next-line react/no-unknown-property */}
                        <input placeholder="Ingrese mensaje a enviar" onChange={handleChange} value={message} onKeyDown={(e) => e.key === 'Enter' && onSendMessage()} className={styles.textBox} />
                        <div className={styles.space} />
                        <div className={styles.sendIcon}><FaChevronRight onClick={onSendMessage} /></div>
                    </Space.Compact>
    
                    {/* <Search loading={sendLoading} placeholder="Ingrese mensaje a enviar" onSearch={onSendMessage} enterButton="Enviar" className='bg-[#603BB0] hover:bg-[#3CB5C7] rounded-lg'/> */}
                    <div className={styles.btnContainerTwo}>
                    <div className={styles.btnContainerChildTwo}>
                        <button onClick={showFindModal} className={styles.regularBtn}><strong>Sonar</strong></button>
                        <button onClick={showShutdownModal} className={styles.shutDownBtn}><strong>Apagar</strong></button>
                        <button onClick={showResetModal} className={styles.shutDownBtn}><strong>Resetear</strong></button>
                    </div>
                    </div>
                    <Modal
                        title="Resetear Reloj"
                        open={toggleResetModal}
                        onOk={handleResetOk}
                        onCancel={handleResetCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres resetear el reloj a sus configuraciones de fábrica?
                        Se borrarán los siguientes datos y más:
                        <ul>
                            <li>Usuarios vinculados: {watchInfo.users}</li>
                            <li>Historial de mensajes: {watchInfo.userMessages + watchInfo.friendMessages} </li>
                            <li>Amigos: {watchInfo.friends} </li>
                            <li>Contactos: {watchInfo.contacts} </li>
                        </ul>
                    </Modal>
                    <Modal
                        title="Apagar Reloj"
                        open={toggleShutdownModal}
                        onOk={handleShutdownOk}
                        onCancel={handleShutdownCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres apagar el reloj?
                    </Modal>
                    <Modal
                        title="Sonar"
                        open={toggleFindModal}
                        onOk={handleFindOk}
                        onCancel={handleFindCancel}
                        okButtonProps={{ className: styles.okBtn }}
                        cancelButtonProps={{ className: styles.cancelBtn }}
                        className="my-custom-modal-class"
                    >
                        ¿Estás seguro/a que quieres hacer sonar el reloj?
                    </Modal>
                </div>
            </div>
    )

    }

    else {
        return (

        <div className={sharedStyles.generalCard}>
            <div className={sharedStyles.cardSubContainer}>
                <div className={sharedStyles.flexCenter}>
                    <div className={sharedStyles.iconContainer}>
                        <img src={leftIcon} width={leftIconWidth} height={leftIconHeight} alt='SoyMomo Logo' />
                    </div>
                    <div className={sharedStyles.flexAndCol}>
                        <h1 className={sharedStyles.iconTitle}>{title}</h1>
                        <p className={sharedStyles.iconSubTitle}>{subtitle}</p>
                    </div>
                </div>
            </div>
            <div className={sharedStyles.metaData}>

                <h3 className={styles.comandTitle2}><strong>Transferir reloj</strong></h3>
                <Space.Compact className={styles.inputContainer}>
                    {/* eslint-disable-next-line react/no-unknown-property */}
                    <input placeholder="Ingrese el deviceId" onChange={handleDeviceIdChange} value={newDeviceId} onKeyDown={(e) => e.key === 'Enter' && onSwapWearers()} className={styles.textBox} />
                    <div className={styles.space} />
                    <div className={styles.sendIcon}><FaChevronRight onClick={onSwapWearers} /></div>
                </Space.Compact>

                <Modal
                    title="Transferir Reloj"
                    open={toggleSwapModal}
                    onOk={handleSwapOk}
                    onCancel={handleSwapCancel}
                    okButtonProps={{ className: styles.okBtn }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                    className="my-custom-modal-class"
                >
                    Estás seguro/a que quieres transferir el reloj a otro dispotivo nuevo?
                    Desde: {deviceId} Hacia: {newDeviceId}
                </Modal>

                <h3 className={styles.comandTitle2}><strong>Enviar mensaje</strong></h3>
                <Space.Compact className={styles.inputContainer}>
                    {/* eslint-disable-next-line react/no-unknown-property */}
                    <input placeholder="Ingrese mensaje a enviar" onChange={handleChange} value={message} onKeyDown={(e) => e.key === 'Enter' && onSendMessage()} className={styles.textBox} />
                    <div className={styles.space} />
                    <div className={styles.sendIcon}><FaChevronRight onClick={onSendMessage} /></div>
                </Space.Compact>

                {/* <Search loading={sendLoading} placeholder="Ingrese mensaje a enviar" onSearch={onSendMessage} enterButton="Enviar" className='bg-[#603BB0] hover:bg-[#3CB5C7] rounded-lg'/> */}
                <div className={styles.btnContainer}>
                <div className={styles.btnContainerChild}>
                    <button onClick={showFindModal} className={styles.regularBtn}><strong>Sonar</strong></button>
                    <button onClick={showChargeContactsModal} className={styles.regularBtn}><strong>Cargar Contactos</strong></button>
                    <button onClick={showChargeSettingsModal} className={styles.regularBtn}><strong>Cargar Config.</strong></button>
                </div>
                <div className={styles.btnContainerChild}>
                    <button onClick={showFactoryModal} className={styles.factoryBtn}><strong>Factory</strong></button>
                    <button onClick={showShutdownModal} className={styles.shutDownBtn}><strong>Apagar</strong></button>
                    <button onClick={showResetModal} className={styles.shutDownBtn}><strong>Resetear</strong></button>
                </div>
                </div>
                <Modal
                    title="Resetear Reloj"
                    open={toggleResetModal}
                    onOk={handleResetOk}
                    onCancel={handleResetCancel}
                    okButtonProps={{ className: styles.okBtn }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                    className="my-custom-modal-class"
                >
                    ¿Estás seguro/a que quieres resetear el reloj a sus configuraciones de fábrica?
                    Se borrarán los siguientes datos y más:
                    <ul>
                        <li>Usuarios vinculados: {watchInfo.users}</li>
                        <li>Historial de mensajes: {watchInfo.userMessages + watchInfo.friendMessages} </li>
                        <li>Amigos: {watchInfo.friends} </li>
                        <li>Contactos: {watchInfo.contacts} </li>
                    </ul>
                </Modal>
                <Modal
                    title="Apagar Reloj"
                    open={toggleShutdownModal}
                    onOk={handleShutdownOk}
                    onCancel={handleShutdownCancel}
                    okButtonProps={{ className: styles.okBtn }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                    className="my-custom-modal-class"
                >
                    ¿Estás seguro/a que quieres apagar el reloj?
                </Modal>
                <Modal
                    title="Sonar"
                    open={toggleFindModal}
                    onOk={handleFindOk}
                    onCancel={handleFindCancel}
                    okButtonProps={{ className: styles.okBtn }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                    className="my-custom-modal-class"
                >
                    ¿Estás seguro/a que quieres hacer sonar el reloj?
                </Modal>
                <Modal
                    title="Factory"
                    open={toggleFactoryModal}
                    onOk={handleFactoryOk}
                    onCancel={handleFactoryCancel}
                    okButtonProps={{ className: styles.okBtn }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                    className="my-custom-modal-class"
                >
                    ¿Estás seguro/a que quieres hacer un factory al reloj?
                </Modal>
                <Modal
                    title="Cargar configuración"
                    open={toggleChargeSettingsModal}
                    onOk={handleChargeSettingsOk}
                    onCancel={handleChargeSettingsCancel}
                    okButtonProps={{ className: styles.okBtn }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                    className="my-custom-modal-class"
                >
                    ¿Estás seguro/a que quieres hacer un cargar configuración al reloj?
                </Modal>
                <Modal
                    title="Cargar contactos"
                    open={toggleChargeContactsModal}
                    onOk={handleChargeContactsOk}
                    onCancel={handleChargeContactsCancel}
                    okButtonProps={{ className: styles.okBtn }}
                    cancelButtonProps={{ className: styles.cancelBtn }}
                    className="my-custom-modal-class"
                >
                    ¿Estás seguro/a que quieres hacer un cargar contactos al reloj?
                </Modal>
            </div>
        </div>

    )
}
}