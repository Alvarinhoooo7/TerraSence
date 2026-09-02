import * as React from 'react';
import { useState } from 'react';
import { Modal, Input, Button } from 'antd';
import CardHeader from './CardHeader';
import InfoRow from './InfoRow';
import formatISODate from '../utils/formater';
import styles from '../styles/TabletCards.module.css';

const MODAL_TITLES = {
    profileName: 'Editar Nombre',
    recoveryEmail: 'Editar Email de recuperación',
    pin: 'Editar PIN',
};

function validateInput(field, value) {
    const trimmed = value.trim();
    if (field === 'profileName') {
        if (!trimmed) return 'El nombre no puede estar vacío.';
        if (trimmed.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
        if (value !== trimmed) return 'El nombre no puede tener espacios al inicio o final.';
    }
    if (field === 'recoveryEmail') {
        if (!trimmed) return 'El email no puede estar vacío.';
        if (value !== trimmed) return 'El email no puede tener espacios al inicio o final.';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return 'El email no es válido.';
        if (!/[a-zA-Z0-9]$/.test(trimmed)) return 'El email no puede terminar con un carácter especial.';
    }
    if (field === 'pin') {
        if (!trimmed) return 'El PIN no puede estar vacío.';
        if (!/^[0-9]{4}$/.test(trimmed)) return 'El PIN debe ser numérico y tener 4 dígitos.';
        if (value !== trimmed) return 'El PIN no puede tener espacios al inicio o final.';
    }
    return '';
}

export default function TabletInfo(props) {
    const personalInfo = props.personalInfo || {};
    const [editingField, setEditingField] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [inputError, setInputError] = useState('');

    function openEditModal(field) {
        setInputValue(personalInfo[field] ?? '');
        setInputError('');
        setEditingField(field);
    }

    function handleCancel() {
        setEditingField(null);
    }

    function handleOk() {
        const error = validateInput(editingField, inputValue);
        if (error) {
            setInputError(error);
            return;
        }
        const value = editingField === 'recoveryEmail'
            ? inputValue.trim().toLowerCase()
            : inputValue.trim();
        setInputError('');
        setEditingField(null);
        props.updateTabletField({ [editingField]: value });
    }

    const editAction = (field) => (
        <button className={styles.editButton} onClick={() => openEditModal(field)}>
            Modificar
        </button>
    );

    return (
        <>
        <Modal
            title={MODAL_TITLES[editingField] || 'Editar'}
            onOk={handleOk}
            onCancel={handleCancel}
            open={editingField !== null}
            footer={[
                <Button key="back" onClick={handleCancel}>
                    Return
                </Button>,
                <Button key="submit" type="primary" className={styles.submitBtn} onClick={handleOk}>
                    OK
                </Button>,
            ]}
        >
            <Input
                value={editingField === 'recoveryEmail' ? inputValue.toLowerCase() : inputValue}
                onChange={(e) => setInputValue(
                    editingField === 'recoveryEmail' ? e.target.value.toLowerCase() : e.target.value
                )}
            />
            {inputError && <div style={{ color: 'red', marginTop: 8 }}>{inputError}</div>}
        </Modal>

        <CardHeader
            title="Datos personales"
            subtitle="Tablet"
            leftIcon="/images/tableIcons/cs-infoPrincipal.svg"
            leftIconWidth={23}
            leftIconHeight={23}
            handleRefresh={props.handleRefresh}
        >
            <InfoRow
                iconSrc="/images/cs-wearerInfoUser.svg"
                label="Nombre"
                value={personalInfo.profileName || 'Sin información'}
                action={editAction('profileName')}
            />
            <InfoRow
                iconSrc="/images/cs-wearerInfoConnection.svg"
                label="Email de recuperación"
                value={personalInfo.recoveryEmail || 'Sin información'}
                action={editAction('recoveryEmail')}
            />
            <InfoRow
                iconSrc="/images/cs-wearerInfoDb.svg"
                label="PIN"
                value={personalInfo.pin || 'Sin información'}
                action={editAction('pin')}
            />
            <InfoRow
                iconSrc="/images/cs-wearerInfoCalendar.svg"
                label="Cumpleaños"
                value={formatISODate(personalInfo.kidBirthday?.iso)}
            />
            <InfoRow
                iconSrc="/images/cs-wearerInfoGps.svg"
                label="Fabricante hardware"
                value={personalInfo.hardwareManufacturer || 'Sin información'}
            />
            <InfoRow
                iconSrc="/images/cs-wearerInfoGps.svg"
                label="Brand de hardware"
                value={personalInfo.hardwareBrand || 'Sin información'}
            />
            <InfoRow
                iconSrc="/images/cs-wearerInfoDb.svg"
                label="Ingreso a BD"
                value={formatISODate(personalInfo.createdAt)}
            />
            <InfoRow
                iconSrc="/images/cs-wearerInfoCalendar.svg"
                label="Última modificación"
                value={formatISODate(personalInfo.updatedAt)}
            />
        </CardHeader>
        </>
    );
}
