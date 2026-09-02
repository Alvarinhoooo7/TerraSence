import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import styles from '../styles/DeviceMainCard.module.css';

/**
 * Card de identidad de un dispositivo (reloj o tablet).
 * Los adaptadores por tipo de dispositivo (WearerMainCard, TabletMainCard)
 * arman el nombre y las lineas de detalle antes de delegar aca.
 */
export default function DeviceMainCard({ name, details = [], deviceImage, deviceImageHeight, openEditModal }) {
  return (
    <div className={styles.generalContainer}>
        <div className={styles.leftContainer}>
            <img src="/images/cs-SoyMomoLogoRound.svg" alt="SoyMomo Icon" />
            <div className={styles.textContainer}>
                <h1 className={styles.name}>{name}</h1>
                {details.map((detail, index) => (
                  <p key={index} className={styles.hardwareDesc}>{detail}</p>
                ))}
            </div>
        </div>
        {deviceImage && (
          <img
            src={deviceImage}
            alt="Modelo del dispositivo"
            className={styles.image}
            style={deviceImageHeight ? { height: deviceImageHeight } : undefined}
          />
        )}
        {openEditModal && (
          <button className={styles.editButton} onClick={openEditModal}>
            <FontAwesomeIcon icon={faEdit} />
          </button>
        )}
    </div>
  );
}
