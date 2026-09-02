import * as React from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/SimTextCard.module.css';
import sharedStyles from '../styles/Common.module.css'
// import sharedStyles from '../styles/Common.module.css'


export default function SimTextCard(props) {
  const simCard = props.simCard || {};

  const { cancellationExplanation='' } = simCard

  return (
    <div className={sharedStyles.generalCard}>
        <div className={styles.structureContainer}>
            <div className={styles.textContainer}>
                <div className={styles.titlesCont}>
                    <h1 className={sharedStyles.iconTitle}>Razón de cancelación</h1>
                </div>
                {/* <br/> */}
                {/* <span className={styles.verticalSpace}/> */}
                <div className={styles.explanationContainer}>
                    <p className={styles.exlpanation}>
                        {
                            cancellationExplanation ? 
                            cancellationExplanation :
                            <span className={styles.missingInfo}>
                                Sin descripción...
                            </span>
                        }
                    </p>
                </div>
            </div>
            <div className={styles.rightCol}>
                <div className={styles.refreshSuperContainer}>
                <div onClick={props.handleRefresh} className={sharedStyles.refreshContainer}>
                    <img src="/images/tableIcons/cs-refreshIcon.svg" className={styles.refreshImg} alt='Refresh Logo' />
                </div>
                </div>
                {/* <div className={styles.imgContainer}>
                    <img src="/images/cs-simCard.svg" alt="SoyMomo Icon" className={styles.image} />
                </div> */}
            </div>
        </div>
    </div>
  );
}

SimTextCard.propTypes = {
  simCard: PropTypes.shape({
    planName: PropTypes.string,
    providerName: PropTypes.string,
    phone: PropTypes.string,
    state: PropTypes.string,
  }),
};