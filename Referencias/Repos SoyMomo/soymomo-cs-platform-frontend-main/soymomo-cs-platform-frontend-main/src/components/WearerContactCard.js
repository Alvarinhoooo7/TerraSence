import React, { useEffect, useState } from 'react';
import { message, Modal, Input, Button, Switch  } from 'antd';
import TableComponent from '../components/tables/table';
import { getContacts, createContact, updateContact, deleteContact } from '../services/wearerService';
import { FaUserPlus } from 'react-icons/fa';
import { contactColumns } from '../components/tables/wearerColumns';

export default function WearerContacts({ wearer, tokens }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteContactModalVisible, setDeleteContactModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [sosInput, setSosInput] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSos, setNewSos] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  


  const handleContactRefresh = () => {
    openMessageApi('Loading...', 'loading');
    const params = { deviceId: wearer.deviceId, imei: wearer.imei };
    getContacts(params, tokens.AccessToken)
      .then((response) => {
        openMessageApi('Loaded!', 'success');
        setContacts(response);
      })
      .catch(() => {
        openMessageApi('Error fetching data!', 'error');
      });
  };

  const openMessageApi = (msg, type) => {
    messageApi.open({ type, content: msg, duration: 2 });
  };

  useEffect(() => {
    if (wearer && (wearer.deviceId || wearer.imei)) {
      const params = { deviceId: wearer.deviceId, imei: wearer.imei };
      getContacts(params, tokens.AccessToken).then(setContacts).catch(console.error);
    }
  }, [wearer, tokens]);
  

  const handleOpenEditModal = (contact) => {
    setSelectedContact(contact);
    setNameInput(contact.name || '');
    setPhoneInput(contact.phone || '');
    setSosInput(contact.sos || false);
    setIsEditModalVisible(true);
  };
  
  const handleCancelEditModal = () => {
    setIsEditModalVisible(false);
  };

  const handleSaveEditContact = async () => {
    if (!selectedContact) return;

    const updatedContact = {
      objectId: selectedContact.objectId,
      name: nameInput,
      phone: phoneInput,
      sos: sosInput,
      hardwareModel: wearer.hardwareModel
    };

    try {
      openMessageApi('Updating contact...', 'loading');
      await updateContact(updatedContact, tokens.AccessToken);
      openMessageApi('Contact updated!', 'success');
      setIsEditModalVisible(false);
      handleContactRefresh(); 
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Error updating contact";
      openMessageApi(errorMessage, 'error');
    }
  };

  const handleDeleteContact = (contact) => {
    setSelectedContact(contact);
    setDeleteContactModalVisible(true);
  };  
  
  const handleOkDeleteContact = async () => {
    if (!selectedContact || !wearer.objectId) return;
    
    const contactToDelete = {
      objectId: selectedContact.objectId,
      hardwareModel: wearer.hardwareModel,
    };  
    
    try {
      openMessageApi('Deleting contact...', 'loading');
      await deleteContact(contactToDelete, tokens.AccessToken);
      openMessageApi('Contact deleted!', 'success');
      setDeleteContactModalVisible(false);
      handleContactRefresh();
    } catch (error) {
      openMessageApi('Error deleting contact, check if it is a SOS contact', 'error');
    }  
  };  
  
  const handleCancelDeleteContact = () => {
    setDeleteContactModalVisible(false)
  };

  const handleOpenCreateModal = () => {
    setNewName('');
    setNewPhone('');
    setNewSos(false);
    setIsCreateModalVisible(true);
  };

  const handleCancelCreateModal = () => {
    setIsCreateModalVisible(false);
  };

  const handleSaveCreateContact = async () => {
    if (!newName || !newPhone) {
      openMessageApi('Nombre y teléfono son requeridos', 'error');
      return;
    }
    try {
      openMessageApi('Creando contacto...', 'loading');
      await createContact(
        {
          deviceId: wearer.deviceId,
          imei: wearer.imei,
          hardwareModel: wearer.hardwareModel,
          name: newName,
          phone: newPhone,
          sos: newSos,
          chatEnabled: false,
        },
        tokens.AccessToken
      );
      openMessageApi('Contacto creado!', 'success');
      setIsCreateModalVisible(false);
      handleContactRefresh();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error creando contacto';
      openMessageApi(errorMessage, 'error');
    }
  };

  const columnsWithEdit = contactColumns(handleOpenEditModal, handleDeleteContact);

  return (
    <>
      {contextHolder}
      <TableComponent
        columns={columnsWithEdit}
        data={contacts}
        leftIcon="/images/tableIcons/cs-contactIcon.svg"
        leftIconHeight={29}
        leftIconWidth={38}
        handleRefresh={handleContactRefresh}
        title="Contactos"
        subtitle="Reloj"
        extraHeaderContent={
          <div
            onClick={handleOpenCreateModal}
            style={{ backgroundColor: '#603BB0', borderRadius: '0.75rem', padding: '0.5rem 1rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}
          >
            <FaUserPlus size={16} />
          </div>
        }
      />
      <Modal
        title="Agregar Contacto"
        open={isCreateModalVisible}
        onOk={handleSaveCreateContact}
        onCancel={handleCancelCreateModal}
        footer={[
          <Button key="back" onClick={handleCancelCreateModal}>
            Cancelar
          </Button>,
          <Button key="submit" type="primary" onClick={handleSaveCreateContact}>
            Crear
          </Button>,
        ]}
      >
        <Input
          placeholder="Nombre"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginBottom: '10px' }}
        />
        <Input
          placeholder="Teléfono (ej: +56912345678)"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
        />
        <div style={{ marginTop: '10px' }}>
          <span>¿Es contacto SOS? </span>
          <Switch
            checked={newSos}
            onChange={(checked) => setNewSos(checked)}
          />
        </div>
      </Modal>
 {/* Modal para editar contacto */}
 <Modal
        title="Editar Contacto"
        open={isEditModalVisible}
        onOk={handleSaveEditContact}
        onCancel={handleCancelEditModal}
        footer={[
          <Button key="back" onClick={handleCancelEditModal}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleSaveEditContact}>
            OK
          </Button>,
        ]}
      >
        <Input
          placeholder="Nombre"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          style={{ marginBottom: '10px' }}
        />
        <Input
          placeholder="Phone"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
        />
          <div style={{ marginTop: '10px' }}>
          <span>¿Es contacto SOS? </span>
          <Switch 
            checked={sosInput}
            onChange={(checked) => setSosInput(checked)}
          />
        </div>
      </Modal>
      <Modal
        title="Eliminar Contacto"
        open={isDeleteContactModalVisible}
        onOk={handleOkDeleteContact}
        onCancel={handleCancelDeleteContact}
        footer={[
          <Button key="back" onClick={handleCancelDeleteContact}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={handleOkDeleteContact}>
            OK
          </Button>,
        ]}
      >
        ¿Seguro que deseas eliminar este contacto?
      </Modal>
    </>
  );
}