import * as React from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/DeviceSIMCard.module.css';
// import sharedStyles from '../styles/Common.module.css'


export default function SimWearerCard(props) {
  const wearer = props.wearer || {};
  const present = props.wearerPresent;

  const {
    firstName = '',
    lastName = '',
    phone = '',
    imei = '',
    deviceId='',
    hardwareModel = '',
  } = wearer;

  let identifierPresent;
  if (!present) {
    identifierPresent = false;
  } else if (imei || deviceId) {
    identifierPresent = true;
  } else {
    identifierPresent = false;
  }


  return (
    <div className={styles.generalContainer}>
        <div className={styles.firstRow}>
            <div className={styles.textContainer}>
                <h1 className={styles.title}>SoyMomo Watch</h1>
                {/* <span className={styles.verticalSpace}/> */}
                { present ? 
                  <div>
                    <p className={styles.hardwareDesc}>
                      <strong>Nombre:</strong>   {firstName ? firstName : <span className={styles.missingInfo}>S/I</span>}
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Apellido:</strong>   {lastName ? lastName : <span className={styles.missingInfo}>S/I</span>}
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Teléfono:</strong>   {phone ?
                        phone :
                        <span className={styles.missingInfo}>S/I</span>
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>imei:</strong>   {imei ?
                        imei :
                        <span className={styles.missingInfo}>S/I</span>
                      }
                    </p>
                    <p className={styles.hardwareDesc}>
                      <strong>Modelo Reloj:</strong>   {hardwareModel ?
                        hardwareModel :
                        <span className={styles.missingInfo}>S/I</span>
                      }
                    </p> 
                  </div>
                  :
                  <div className={styles.leftText}>
                    <p className={styles.missingInfo}>Reloj no encontrado para este imei...</p>
                  </div>

                }
            </div>
            <div className={styles.rightCol}>
              <div className={styles.refreshSuperContainer}>
                <div onClick={props.handleRefresh} className={styles.refreshContainer}>
                    <img src="/images/tableIcons/cs-refreshIcon.svg" className={styles.refreshImg} alt='Refresh Logo' />
                </div>
              </div>
              <div className={styles.imgContainer}>
                  <img src="/images/cs-defaultWatchModel.svg" alt="SoyMomo Icon" className={styles.image} />
              </div>
            </div>
        </div>
          {identifierPresent?
            (<div className={styles.secondRow}>
              <button onClick={props.navWearerDashboard} className={styles.btn}><strong>Ver Info</strong></button>
            </div>) :
            <div></div>
          }
    </div>
  );
}

SimWearerCard.propTypes = {
  simCard: PropTypes.shape({
    planName: PropTypes.string,
    providerName: PropTypes.string,
    phone: PropTypes.string,
    state: PropTypes.string,
  }),
};