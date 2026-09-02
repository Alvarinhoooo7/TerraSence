import * as React from 'react';
import styles from '../styles/ListItem.module.css'


export function TabletListItem(props) {

    const {
        objectId,
        hid='',
        profileName='',
        recoveryEmail='',
        hardwareModel='',
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
            {profileName ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{profileName}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {hid ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{hid}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {recoveryEmail ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{recoveryEmail}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            {hardwareModel ?
                <div className={styles.itemInfo}>
                    <p className={styles.infoTxt}>{hardwareModel}</p>
                </div> :
                <div className={styles.undefinedContainer}>
                    <p className={styles.undefined}>No definido</p>
                </div>
            }
            <div className={styles.itemInfo}>
                <img
                    src="/images/tableIcons/cs-tabletIconSearch.svg"
                    alt="Tablet"
                    className={styles.typeIcon}
                />
            </div>
        </div>
    )
}

export function TabletListTitle() {

    return (
        <div className={styles.titleRow}>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Object ID</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Perfil</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>HID</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Email de recuperación</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Modelo</p>
            </div>
            <div className={styles.titleContainer}>
                <p className={styles.titleTxt}>Dispositivo</p>
            </div>

        </div>
    )
}
