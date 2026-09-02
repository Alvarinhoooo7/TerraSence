import * as React from 'react';
import { useState } from 'react';
import CardHeader from './CardHeader';
import InfoRow from './InfoRow';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import styles from '../styles/WearerSettings.module.css';
import { Modal, Select } from 'antd';

export default function WearerSettings(props) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [timeZone, setTimeZone] = useState(props.watchSettings.timeZone);
  const [amPm, setAmPm] = useState(props.watchSettings.amPm);
  const [soundMode, setSoundMode] = useState(props.watchSettings.soundMode);
  const [language, setLanguage] = useState(props.watchSettings.language);
  const [dialpadEnabled, setDialpadEnabled] = useState(props.watchSettings.dialpadEnabled);
  const [gpsFrequencySeconds, setGpsFrequencySeconds] = useState(props.watchSettings.gpsFrequencySeconds);
  const [batterySaveEnabled, setBatterySaveEnabled] = useState(props.watchSettings.batterySaveEnabled);

  const handleOpenEditModal = () => {
    setGpsFrequencySeconds(props.watchSettings.gpsFrequencySeconds)
    setTimeZone(props.watchSettings.timeZone)
    setAmPm(props.watchSettings.amPm)
    setSoundMode(props.watchSettings.soundMode)
    setLanguage(props.watchSettings.language)
    setDialpadEnabled(props.watchSettings.dialpadEnabled)
    setBatterySaveEnabled(props.watchSettings.batterySaveEnabled)
    setIsEditModalOpen(true);
  }

  const timeZoneTuples = [
      ["GMT-12:00", "-12"],
      ["GMT-11:00", "-11"],
      ["GMT-10:00", "-10"],
      ["GMT-09:30", "-9.5"],
      ["GMT-09:00", "-9"],
      ["GMT-08:00", "-8"],
      ["GMT-07:00", "-7"],
      ["GMT-06:00", "-6"],
      ["GMT-05:00", "-5"],
      ["GMT-04:00", "-4"],
      ["GMT-03:30", "-3.5"],
      ["GMT-03:00", "-3"],
      ["GMT-02:00", "-2"],
      ["GMT-01:00", "-1"],
      ["GMT±00:00", "0"],
      ["GMT+01:00", "1"],
      ["GMT+02:00", "2"],
      ["GMT+03:00", "3"],
      ["GMT+03:30", "3.5"],
      ["GMT+04:00", "4"],
      ["GMT+04:30", "4.5"],
      ["GMT+05:00", "5"],
      ["GMT+05:30", "5.5"],
      ["GMT+05:45", "5.75"],
      ["GMT+06:00", "6"],
      ["GMT+06:30", "6.5"],
      ["GMT+07:00", "7"],
      ["GMT+08:00", "8"],
      ["GMT+08:30", "8.5"],
      ["GMT+08:45", "8.75"],
      ["GMT+09:00", "9"],
      ["GMT+09:30", "9.5"],
      ["GMT+10:00", "10"],
      ["GMT+10:30", "10.5"],
      ["GMT+11:00", "11"],
      ["GMT+12:00", "12"],
      ["GMT+12:45", "12.75"],
      ["GMT+13:00", "13"],
      ["GMT+14:00", "14"]
  ]

  const soundModes = [
    ["Sound and Vibration", 1],
    ["Sound Only", 2],
    ["Vibration Only", 3],
    ["Silent", 4]
  ]

  const languageOptions = props.watchModel === 7 ? 
  [
    ["Deutsch", "5"],
    ["English", "0"],
    ["Español", "4"],
    ["Polski", "17"],
  ] :
  [
    ["Deutsch", "5"],
    ["English", "0"],
    ["Español", "4"],
    ["Français", "10"],
    ["Polski", "17"],
    ["Português", "3"],
    ["Svenska", "13"]
  ]

  const gpsOptions = [
    ["1 minute", 60],
    ["3 minutes", 180],
    ["5 minutes", 300],
    ["10 minutes", 600],
    ["30 minutes", 1800],
    ["60 minutes", 3600],
  ]

  const handleOkEdit = () => {
    setIsEditModalOpen(false);
    props.editWatchSettings({
      timeZone,
      amPm,
      soundMode,
      language,
      dialpadEnabled,
      gpsFrequencySeconds,
      batterySaveEnabled
    })
  }

  return (
    <>
    <Modal title="Editar Ajustes Reloj"  onOk={handleOkEdit} onCancel={() => setIsEditModalOpen(false)} open={isEditModalOpen}>
      <table>
        <tr>
          <td>Frecuencia del GPS:</td>
          <td><Select
            value={gpsFrequencySeconds ?? 0}
            style={{ width: 120 }}
            onChange={e => setGpsFrequencySeconds(e)}
            options={gpsOptions.map(([label, value]) => ({ value, label }))}
          /></td>
        </tr>
        <tr>
          <td>Formato de hora (24hrs/12hrs):</td>
          <td><Select
            value={amPm ?? true}
            style={{ width: 120 }}
            onChange={e => setAmPm(e)}
            options={[
              { value: true, label: '12h' },
              { value: false, label: '24h' },
            ]}
          /></td>
        </tr>
        <tr>
          <td>Sonido:</td>
          <td><Select
            value={soundMode ?? 0}
            style={{ width: 200 }}
            onChange={e => setSoundMode(e)}
            options={soundModes.map(([label, value]) => ({ value, label }))}
          /></td>
        </tr>
        <tr>
          <td>Idioma:</td>
          <td><Select
            value={language ?? 0}
            style={{ width: 200 }}
            onChange={e => setLanguage(e)}
            options={languageOptions.map(([label, value]) => ({ value, label }))}
          /></td>
        </tr>
        <tr>
          <td>Zona horaria:</td>
          <td><Select
            value={timeZone ?? "0"}
            style={{ width: 200 }}
            onChange={e => setTimeZone(e)}
            options={timeZoneTuples.map(([label, value]) => ({ value, label }))}
          /></td>
        </tr>
        <tr>
          <td>Teclado:</td>
          <td><Select
            value={dialpadEnabled ?? false}
            style={{ width: 120 }}
            onChange={e => setDialpadEnabled(e)}
            options={[
              { value: true, label: 'Activado' },
              { value: false, label: 'Desactivado' },
            ]}
          /></td>
        </tr>
        <tr>
          <td>Ahorro de batería:</td>
          <td><Select
            value={batterySaveEnabled ?? false}
            style={{ width: 120 }}
            onChange={e => setBatterySaveEnabled(e)}
            options={[
              { value: true, label: 'Activado' },
              { value: false, label: 'Desactivado' },
            ]}
          /></td>
        </tr>
      </table>
  </Modal>

  <div className={styles.cardContainer}>
      <CardHeader
        title={props.title}
        subtitle={props.subtitle}
        leftIcon={props.leftIcon}
        leftIconWidth={props.leftIconWidth}
        leftIconHeight={props.leftIconHeight}
        handleRefresh={props.handleRefresh}
      >
        <div className={styles.buttonContainer}>
          <button className={styles.editButton} onClick={handleOpenEditModal}>
            <FontAwesomeIcon icon={faEdit} />
          </button>
        </div>
        <InfoRow
          iconSrc="/images/cs-wearerInfoUser.svg"
          label="Modo GPS"
          value={gpsOptions.find(([, value]) => value === props.watchSettings.gpsFrequencySeconds)?.[0] ?? 'Undefined'}
        />
        <InfoRow
          iconSrc="/images/cs-wearerInfoSim.svg"
          label="Formato de Hora"
          value={props.watchSettings.amPm === false ? '24h' : '12h'}
        />
        <InfoRow
          iconSrc="/images/cs-wearerInfoCalendar.svg"
          label="Modo de sonido"
          value={soundModes.find(([, value]) => value === props.watchSettings.soundMode)?.[0] ?? 'Undefined'}
        />
        <InfoRow
          iconSrc="/images/cs-wearerInfoGps.svg"
          label="Idioma"
          value={languageOptions.find(([, value]) => value === props.watchSettings.language)?.[0] ?? 'Undefined'}
        />
        <InfoRow
          iconSrc="/images/cs-wearerInfoBattery.svg"
          label="Zona horaria"
          value={timeZoneTuples.find(([, value]) => value === props.watchSettings.timeZone)?.[0] ?? 'Undefined'}
        />
        <InfoRow
          iconSrc="/images/cs-wearerInfoConnection.svg"
          label="Teclado"
          value={props.watchSettings.dialpadEnabled !== undefined ? (
            props.watchSettings.dialpadEnabled === true ? "Activado":
              props.watchSettings.dialpadEnabled === false ? "Desactivado": "Undefined" 
          ): 'Undefined'}
        />
        <InfoRow
          iconSrc="/images/cs-wearerInfoSaveBattery.svg"
          label="Modo ahorro de batería"
          value={props.watchSettings.batterySaveEnabled !== undefined ? (
            props.watchSettings.batterySaveEnabled === true ? "Activado":
              props.watchSettings.batterySaveEnabled === false ? "Desactivado": "undefined"
          ): 'Undefined'}
        />
      </CardHeader>
    </div>
    
    </>
  );
}
