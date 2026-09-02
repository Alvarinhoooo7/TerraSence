import * as React from 'react';
import { Tooltip } from 'antd';
import styles from '../styles/SimStatusBadges.module.css';

export function SimStatusBadges({ watchSim, tabletSim }) {
    const getLedClass = (simValue) => {
        return simValue ? styles.ledActive : styles.ledInactive;
    };

    const getTooltip = (simValue, deviceType) => {
        if (simValue) {
            return (
                <div className={styles.tooltipContent}>
                    <div className={styles.tooltipTitle}>SIM {deviceType}</div>
                    <div className={styles.tooltipStatus}>SIM encontrada en base de datos</div>
                    <div className={styles.tooltipIccid}>
                        <span className={styles.iccidLabel}>ICCID:</span>
                        <span className={styles.iccidValue}>{simValue}</span>
                    </div>
                </div>
            );
        }
        return (
            <div className={styles.tooltipContent}>
              <div className={styles.tooltipTitle}>SIM {deviceType}</div>
              <div className={styles.tooltipStatus}>No se encontró ninguna SIM</div>
            </div>
          );
    };
    

    return (
      <div className={styles.ledContainer}>
        <div className={styles.ledWrapper}>
          <img
            src="/images/cs-watchIconSearch.svg"
            alt="Watch"
            className={styles.ledIcon}
          />
          <Tooltip title={getTooltip(watchSim, "Watch")} placement="bottom">
            <div className={`${styles.led} ${getLedClass(watchSim)}`} />
          </Tooltip>
        </div>
        <div className={styles.ledWrapper}>
          <img
            src="/images/tableIcons/cs-tabletIconSearch.svg"
            alt="MomoPhone"
            className={styles.ledIcon}
          />
          <Tooltip
            title={getTooltip(tabletSim, "MomoPhone")}
            placement="bottom"
          >
            <div
              className={`${styles.led} ${getLedClass(tabletSim)}`}
            />
          </Tooltip>
        </div>
      </div>
    );
} 