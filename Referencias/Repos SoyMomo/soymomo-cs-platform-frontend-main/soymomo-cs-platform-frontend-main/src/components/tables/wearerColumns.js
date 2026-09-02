import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import styles from '../../styles/TrashButton.module.css';


export const wifiColumns = [
    {
        title: '#',
        width: 100,
        dataIndex: 'name',
        key: 'name',
        align: 'center',
    },
    {
        title: 'Fecha',
        width: 150,
        dataIndex: 'date',
        key: 'date',
        align: 'center',
    },
    {
        title: 'Counter LK',
        dataIndex: 'counter',
        key: 'counter',
        width: 150,
        align: 'center',
    },
    {
        title: '% Error',
        dataIndex: 'error',
        key: 'error',
        width: 100,
        align: 'center',
    },
    {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        align: 'center',
    }
    // {
    //   title: 'Action',
    //   key: 'operation',
    //   width: 100,
    //   render: () => <a>action</a>,
    // },
];

export const friendMessageColumns = [
    {
        title: 'Mensaje',
        dataIndex: 'message',
        key: 'message',
        width: 150,
        align: 'center',
    },
    {
        title: 'Enviado por',
        dataIndex: 'sender',
        key: 'sender',
        width: 100,
        align: 'center',
    },
    {
        title: 'Desde',
        dataIndex: 'from',
        key: 'from',
        width: 100,
        align: 'center',
    },
    {
        title: 'Fecha',
        dataIndex: 'date',
        key: 'date',
        width: 150,
        align: 'center',
    },
];

export const chatUserColumns = [
    {
        title: 'Remitente',
        dataIndex: 'sender',
        key: 'sender',
        width: 150,
        align: 'center',
    },
    {
        title: 'Tipo',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        align: 'center',
        render: (type) => {
            const typeTranslations = {
                'text': 'Texto',
                'audio': 'Audio',
                'image': 'Imagen'
            };
            return (
                <span style={{ 
                    color: '#000'
                }}>
                    {typeTranslations[type] || type}
                </span>
            );
        }
    },
    {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        align: 'center',
        render: (status) => {
            const statusTranslations = {
                'received': 'Recibido',
                'sent': 'Enviado',
                'sending': 'Enviando',
                'failed': 'Fallado',
            };
            if (status === null || status === undefined || status === '') return 'Sin Datos';
            return statusTranslations[status] || status;
        }
    },
    {
        title: 'Fecha',
        dataIndex: 'date',
        key: 'date',
        width: 150,
        align: 'center',
    },
];

export const friendsColumns = [
    {
        title: 'Nombre',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        align: 'center',
    },
    {
        title: 'Aprobación 1',
        dataIndex: 'approval1',
        key: 'approval1',
        width: 130,
        align: 'center',
    },
    {
        title: 'Aprobación 2',
        dataIndex: 'approval2',
        key: 'approval2',
        width: 130,
        align: 'center',
    },
    {
        title: 'Device ID',
        dataIndex: 'deviceId',
        key: 'deviceId',
        width: 150,
        align: 'center',
    }
]

export const userColumns = [
    {
        title: '#',
        dataIndex: 'id',
        key: 'id',
        width: 100,
        align: 'center',
    },
    {
        title: 'Nombre',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        align: 'center',
    },
    {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        width: 150,
        align: 'center',
    },
    {
        title: 'Autorizado',
        dataIndex: 'authorized',
        key: 'authorized',
        width: 100,
        align: 'center',
    },
    {
        title: 'Autorizar',
        key: 'autorizar',
        width: 50,
        render: (row) => 
        
        <button onClick={() => {
                console.log(row)
            }} 
            style={{backgroundColor: row.authorized == 'Si' ? '#F93C7C' : '#32B8C0', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>{row.authorized == 'Si' ? "Desautorizar" : "Autorizar"} 
        </button>,
        align: 'center'
    },
    {
        title: 'Eliminar',
        key: 'eliminar',
        width: 50,
        render: (row) => 
        <button onClick={() => {
                console.log(row)
            }} 
            style={{backgroundColor: '#F93C7C', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>Eliminar
        </button>,
        align: 'center'
    },
    {
        title: 'Dar admin',
        key: 'darAdmin',
        width: 50,
        render: (row) => 
        <button onClick={() => {
                console.log(row)
            }} 
            style={{backgroundColor: '#F93C7C', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>Dar admin
        </button>,
        align: 'center'
    },
    // {
    //     title: 'Sistema operativo',
    //     dataIndex: 'os',
    //     key: 'os',
    //     width: 150,
    //     align: 'center',
    // },
    // {
    //     title: 'Versión',
    //     dataIndex: 'version',
    //     key: 'version',
    //     width: 100,
    //     align: 'center',
    // },
    // {
    //     title: 'País',
    //     dataIndex: 'country',
    //     key: 'country',
    //     width: 100,
    //     align: 'center',
    // },
    // {
    //     title: 'Acción',
    //     key: 'action',
    //     width: 100,
    //     render: (row) => <button onClick={() => handleEdit(row)} style={{backgroundColor: '#32B8C0', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>Editar</button>,
    //     align: 'center'
    // },
    // {
    //     title: 'Admin',
    //     key: 'admin',
    //     width: 100,
    //     render: () => <button style={{backgroundColor: '#F93C7D', color: 'white', padding: '0.25rem', borderRadius: '1rem', width: '100px'}}>Desvincular</button>,
    //     align: 'center',
    // }
];

export const contactColumns = (handleOpenEditModal, handleDeleteContact) => [
    {
        title: 'Posición',
        dataIndex: 'position',
        key: 'position',
        width: 100,
        align: 'center',
    },
    {
        title: 'Nombre',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        align: 'center',
    },
    {
        title: 'Teléfono',
        dataIndex: 'phone',
        key: 'phone',
        width: 150,
        align: 'center',
    },
    {
        title: 'SOS',
        dataIndex: 'sos',
        key: 'sos',
        width: 100,
        align: 'center',
        render: (sos) => (sos ? 'Sí' : 'No')
    },
    {
        title: 'Últ. actualización',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 150,
        align: 'center',
    },   
    {
        title: 'Editar',
        dataIndex: 'editar',
        key: 'editar',
        width: 50,
        align: 'center',
        render: (_, record) => (
            <button onClick={() => handleOpenEditModal(record)}>
                <FontAwesomeIcon icon={faEdit} />
            </button>
        ),
    },
    {
        title: 'Eliminar',
        dataIndex: 'eliminar',
        key: 'eliminar',
        width: 50,
        align: 'center',
        render: (_, record) => (
            <TrashButton onDelete={() => handleDeleteContact(record)} />
        ),
    },
];

const TrashButton = ({ onDelete }) => {
    const [isAnimating, setIsAnimating] = useState(false);
  
    const handleDeleteClick = () => {
      // Activamos la animación
      setIsAnimating(true);
      
      // Después de 500 msegundos, detenemos la animación.
      setTimeout(() => {
        setIsAnimating(false);
        if (onDelete) {
            onDelete(); // Abrir el modal de confirmación de eliminación
          }
      }, 500);
    };
  
    return (
        <button
        className={`${styles.trashButton} ${isAnimating ? styles.animate : ''}`}
        onClick={handleDeleteClick}
      >
        <div className={styles.trashBin}>
          <FontAwesomeIcon icon={faTrash} className={styles.trashIcon} />
          <div className={styles.lid}></div> {/* Solo mantenemos la tapa */}
        </div>
      </button>
    );
  };
      
    export default TrashButton;