import * as React from 'react';
import PropTypes from 'prop-types';
import styles from '../styles/WearerSimHistoryCard.module.css';

export default function WearerSimHistoryCard(props) {
  const history = props.history || [];

  return (
    <div className={styles.generalContainer}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Subscripciones anteriores</h1>
        <div onClick={props.handleRefresh} className={styles.refreshContainer}>
          <img
            src="/images/tableIcons/cs-refreshIcon.svg"
            className={styles.refreshImg}
            alt="Refresh Logo"
          />
        </div>
      </div>

      {history.length === 0 ? (
        <p className={styles.emptyText}>No hay subscripciones anteriores</p>
      ) : (
        <div className={styles.list}>
          {history.map((item) => (
            <div key={item.objectId} className={styles.item}>
              <div className={styles.itemInfo}>
                <p className={styles.itemLine}>
                  <strong>iccId:</strong>{' '}
                  {item.iccId ? item.iccId : <span className={styles.missingInfo}>Null</span>}
                </p>
                <p className={styles.itemLine}>
                  <strong>Estado:</strong>{' '}
                  {item.state ? item.state : <span className={styles.missingInfo}>Null</span>}
                </p>
                {item.planName ? (
                  <p className={styles.itemLine}>
                    <strong>Plan:</strong> {item.planName}
                  </p>
                ) : null}
                {item.terminatedAt ? (
                  <p className={styles.itemLine}>
                    <strong>Cancelado:</strong> {item.terminatedAt}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => props.navSimDashboard(item.objectId)}
                className={styles.btn}
              >
                <strong>Ver Info</strong>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

WearerSimHistoryCard.propTypes = {
  history: PropTypes.arrayOf(
    PropTypes.shape({
      objectId: PropTypes.string,
      iccId: PropTypes.string,
      state: PropTypes.string,
      planName: PropTypes.string,
      terminatedAt: PropTypes.string,
    })
  ),
  navSimDashboard: PropTypes.func,
  handleRefresh: PropTypes.func,
};
