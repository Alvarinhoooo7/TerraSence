import * as React from 'react';
import styles from '../styles/InfoRow.module.css';

export default function InfoRow({ iconSrc, label, value, action }) {
    // Valores cortos ("Activado", "motorola") no deben partirse en dos lineas;
    // los largos (email, iccId) si, o se salen de la card en columnas angostas.
    const isLongValue = typeof value === 'string' && value.length > 20;

    return (
        <div className={styles.generalContainer}>
            <img src={iconSrc} alt={`${label} Icon`} />
            <div className={styles.textContainer}>
                <h3 className={styles.title}>{label}:</h3>
                <div className={styles.valueContainer}>
                    <p className={isLongValue ? styles.subTitleWrap : styles.subTitle}>{value}</p>
                    {action}
                </div>
            </div>
        </div>
    )
}
