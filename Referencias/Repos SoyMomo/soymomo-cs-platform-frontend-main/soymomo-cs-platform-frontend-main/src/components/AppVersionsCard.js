import * as React from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/AppVersionsCard.module.css';

export default function AppVersionsCard(props) {

  return (
    <div className={styles.softVerCont}>
        <p className={`${styles.text} ${styles.bold}`}>Últimas versiones de software</p>
        <div className={styles.secondRow}>
            <div className={styles.miniCard}>
                <img src="/images/cs-AndroidIcon.svg" alt="SoyMomo Icon" />
                <p className={`${styles.text} ${styles.bold}`}>Version: </p>
                <p className={styles.text}>{props.versionAndroid}</p>
            </div>
            <div className={styles.miniCard}>
                <img src="/images/cs-AppleIcon.svg" alt="SoyMomo Icon" />
                <p className={`${styles.text} ${styles.bold}`}>Version: </p>
                <p className={styles.text}>{props.versionApple}</p>
            </div>
        </div>
    </div>
  );
}

AppVersionsCard.propTypes = {
  versionAndroid: PropTypes.string.isRequired,
  versionApple: PropTypes.string.isRequired,
};
