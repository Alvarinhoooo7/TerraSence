import * as React from 'react';
import styles from '../styles/ListItem.module.css'
// import sharedStyles from '../styles/Common.module.css'


export function SimListItem(props) {

    const { 
        // objectId,
        msisdn='',
        iccId,
        name='',
        lastname='',
        phone='',
        status='',
        instance='',
        handleClick
    } = props

    const iconSrc = instance === 'tablet' ? '/images/tableIcons/cs-tabletIconSearch.svg' : '/images/cs-watchIconSearch.svg';

    return (
        <div className={styles.row} onClick={handleClick}>
            {iccId ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{iccId}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {msisdn ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{msisdn}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {name ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{name}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {lastname ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{lastname}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {phone ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{phone}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {status ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{status}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            <div className={styles.itemInfo}>
                <img 
                    src={iconSrc} 
                    alt={instance === 'tablet' ? 'MomoPhone' : 'Watch'} 
                    className={instance === 'tablet' ? styles.typeIcon : styles.watchIcon} 
                />
            </div>
        </div>
    )
}

export function SimListTitle() {

    return (
        <div className={styles.titleRow}>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>ICCID</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Número SIM</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Nombre</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Apellido</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Número Suscriptor</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Estado</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Dispositivo</p>
            </div>

        </div>
    )
}