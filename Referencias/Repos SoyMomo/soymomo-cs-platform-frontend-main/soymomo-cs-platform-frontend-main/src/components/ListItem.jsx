import * as React from 'react';
import styles from '../styles/ListItem.module.css'
// import sharedStyles from '../styles/Common.module.css'


export function ListItem(props) {

    const { objectId,
            deviceId,
            firstName,
            lastName,
            imei,
            phone,
			handleClick
    } = props

    return (
        <div className={styles.row} onClick={handleClick}>
            {objectId ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{objectId}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {firstName ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{firstName}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {lastName ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{lastName}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {deviceId ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{deviceId}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {imei ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{imei}</p>
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
        </div>
    )
}

export function ListTitle() {

    return (
        <div className={styles.titleRow}>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Object ID</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Nombre</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Apellido</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Device ID</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Imei</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>N° Telefono</p>
            </div>

        </div>
    )
}