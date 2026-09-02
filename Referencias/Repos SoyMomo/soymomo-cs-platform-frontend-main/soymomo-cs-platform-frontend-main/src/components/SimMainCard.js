import * as React from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/SimMainCard.module.css';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { fetchEntelDevice } from '../services/entelService';
import { message } from 'antd';
import { useAuth } from '../authContext';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function SimMainCard(props) {
  const simCard = props.simCard || {};
  const [entelData, setEntelData] = React.useState(null);
  const { tokens } = useAuth();

  const navigate = useNavigate();

  const {
    iccId = '',
    plan = '',
    providerName = '',
    phone = '',
    state = '',
    networkProvider = '',
    paymentProvider = '',
    paymentId = '',
    paymentStatus = '',
    stripeSubscriptionData = undefined,
    activatedAt = '',
    terminatedAt = '',
    scheduledDeactivationDate = '',
  } = simCard;
  
  let planName;

  if (plan) {
    planName = plan.title
  }

  const formatDateCL = (value) =>
    value
      ? dayjs.utc(value).tz('America/Santiago').format('DD/MM/YYYY HH:mm')
      : null;

  const activatedAtFmt = formatDateCL(activatedAt);
  const terminatedAtFmt = formatDateCL(terminatedAt);
  const scheduledDeactivationFmt = formatDateCL(scheduledDeactivationDate);

  React.useEffect(() => {
    const getEntelData = async () => {
      if (!iccId || !tokens?.AccessToken || providerName !== 'ENTEL') {
        return;
      }
      try {
        const data = await fetchEntelDevice(iccId, tokens.AccessToken);
        setEntelData(data);
      } catch (error) {
        message.error('No se pudo obtener la información de Entel');
      }
    };

    getEntelData();
  }, [iccId, tokens, providerName]);

  const handleRefresh = async () => {
    try {
      // Llamar al prop handleRefresh del padre para datos de SIM
      await props.handleRefresh();

      // Si es Entel, refrescar datos de Entel
      if (providerName === 'ENTEL' && tokens?.AccessToken) {
        const data = await fetchEntelDevice(iccId, tokens.AccessToken);
        setEntelData(data);
      }
    } catch (error) {
      message.error('No se pudo obtener la información de Entel');
    }
  };

  // Stripe cancel/canceled fields in Chilean time
  let cancelAtCL = null;
  let canceledAtCL = null;
  let cancelAtPeriodEnd = null;
  if (stripeSubscriptionData) {
    if (stripeSubscriptionData.cancel_at) {
      cancelAtCL = dayjs.unix(stripeSubscriptionData.cancel_at).tz('America/Santiago').format('DD-MM-YYYY');
    }
    if (stripeSubscriptionData.canceled_at) {
      canceledAtCL = dayjs.unix(stripeSubscriptionData.canceled_at).tz('America/Santiago').format('DD-MM-YYYY');
    }
    if (typeof stripeSubscriptionData.cancel_at_period_end !== 'undefined') {
      cancelAtPeriodEnd = stripeSubscriptionData.cancel_at_period_end ? 'Sí' : 'No';
    }
  }

  const formatUsage = (usage, unit = 'MB') => {
    if (typeof usage !== 'number') return 'S/I';
    return `${usage.toFixed(2)} ${unit}`;
  };
  
  return (
    <div className={styles.generalContainer}>
        <div className={styles.firstRow}>
            <div className={styles.textContainer}>
                <div className={styles.columnsContainer}>
                  <div className={styles.column}>
                    <h1 className={styles.title}>SoyMomo SIM</h1>
                    <p className={styles.hardwareDesc}>
                      <strong>Número de SIM (iccID):</strong>   {iccId ? iccId : <span className={styles.missingInfo}>S/I</span>}
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Plan:</strong>   {plan ? planName : <span className={styles.missingInfo}>S/I</span>}
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Número de teléfono (msisdn):</strong>   {phone ?
                        phone :
                        <span className={styles.missingInfo}>S/I</span>
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Proveedor:</strong>   {providerName ?
                        providerName :
                        <span className={styles.missingInfo}>S/I</span>
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Estado:</strong>   {state ?
                        (state === 'TERMINATED' ?
                          <span className={styles.terminated}>TERMINATED</span> :
                          state
                        ):
                        (<span className={styles.missingInfo}>S/I</span>)
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Compañía telefónica:</strong>   {networkProvider ?
                        networkProvider :
                        <span className={styles.missingInfo}>S/I</span>
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Compañía de Pagos:</strong>   {paymentProvider ?
                        paymentProvider :
                        <span className={styles.missingInfo}>S/I</span>
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>ID de Pago:</strong>   {paymentId ?
                        paymentId :
                        <span className={styles.missingInfo}>No tiene pago de Apio ni Stripe</span>
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Estado de Pago:</strong>   { paymentStatus ?
                        paymentStatus :
                        <span className={styles.missingInfo}>No tiene Status de pago</span>
                      }
                    </p>

                    {stripeSubscriptionData && (
                      <>
                        {canceledAtCL && (
                          <p className={styles.hardwareDesc}><strong>Fecha de Solicitud de Cancelación:</strong> {canceledAtCL}</p>
                        )}
                        {cancelAtCL && (
                          <p className={styles.hardwareDesc}><strong>Fecha de Cancelación por Stripe:</strong> {cancelAtCL}</p>
                        )}
                      </>
                    )}

                    {activatedAtFmt && (
                      <p className={styles.hardwareDesc}><strong>Fecha de Activación:</strong> {activatedAtFmt}</p>
                    )}
                    {terminatedAtFmt && (
                      <p className={styles.hardwareDesc}><strong>Fecha de Cancelación:</strong> {terminatedAtFmt}</p>
                    )}
                    {scheduledDeactivationFmt && (
                      <p className={styles.hardwareDesc}><strong>Cancelación del Servicio:</strong> {scheduledDeactivationFmt}</p>
                    )}

                    <div className={styles.buttonContainer}>
                      <button onClick={() => navigate(-1)} className={styles.btn}><strong>Volver atras</strong></button>
                    </div>
                  </div>
                  {providerName === 'ENTEL' && (
                    <div className={styles.column}>
                      <h1 className={styles.title}>Información Entel</h1>
                      <p className={styles.hardwareDesc}>
                        <strong>MSISDN:</strong> {entelData?.msisdn || <span className={styles.missingInfo}>S/I</span>}
                      </p>
                      <p className={styles.hardwareDesc}>
                        <strong>IMEI:</strong> {entelData?.imei || <span className={styles.missingInfo}>S/I</span>}
                      </p>
                      <p className={styles.hardwareDesc}>
                        <strong>Estado:</strong> {entelData?.status || <span className={styles.missingInfo}>S/I</span>}
                      </p>
                      <p className={styles.hardwareDesc}>
                        <strong>ID de Dispositivo:</strong> {entelData?.deviceID || <span className={styles.missingInfo}>S/I</span>}
                      </p>
                      <p className={styles.hardwareDesc}>
                        <strong>Consumo de Datos del Mes:</strong> {formatUsage(entelData?.ctdDataUsage, 'MB')}
                      </p>
                      <p className={styles.hardwareDesc}>
                        <strong>Consumo de Voz del Mes:</strong> {formatUsage(entelData?.ctdVoiceUsage, 'min')}
                      </p>
                    </div>
                  )}
                </div>
            </div>
            <div className={styles.rightCol}>
              <div className={styles.refreshSuperContainer}>
                <div onClick={handleRefresh} className={styles.refreshContainer}>
                    <img src="/images/tableIcons/cs-refreshIcon.svg" className={styles.refreshImg} alt='Refresh Logo' />
                </div>
              </div>
              <div className={styles.imgContainer}>
                  <img src="/images/cs-simCard.svg" alt="SoyMomo Icon" className={styles.image} />
              </div>
            </div>
        </div>
    </div>
  );
}

SimMainCard.propTypes = {
  simCard: PropTypes.shape({
    planName: PropTypes.string,
    providerName: PropTypes.string,
    phone: PropTypes.string,
    state: PropTypes.string,
  }),
  handleRefresh: PropTypes.func,
};