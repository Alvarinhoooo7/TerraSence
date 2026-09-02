import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart } from 'recharts';
import { Row, Col, Button, DatePicker, Alert } from 'antd';
import dayjs from 'dayjs';
import styles from '../styles/WearerBatteryHistory.module.css';
import sharedStyles from '../styles/Common.module.css';

// Función para formatear la fecha y hora en "dd/mm/aaaa HH:mm"
const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export default function WearerBatteryHistory({
  data,
  handleRefresh,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  fetchBatteryHistory,
  resetFilters,
}) {
  // Se formatea la data para el eje X
  const formattedData = data.map(item => ({
    ...item,
    timestamp: formatDateTime(item.timestamp)
  }));

  // Función para deshabilitar fechas futuras en DatePicker
  const disableFutureDates = (current) => {
    return current && current > dayjs().endOf('day');
  };

  // Validación: solo deshabilitar si hay ambas fechas y el rango es mayor a 7 días
  const isRangeTooLong = fromDate && toDate && dayjs(toDate).diff(dayjs(fromDate), 'day') > 7;

  return (
    <div className={styles.generalContainer}>
      {/* Encabezado del componente */}
      <div className={sharedStyles.cardSubContainer}>
        <div className={sharedStyles.flexCenter}>
          <div className={styles.iconContainer}>
            <img src="/images/cs-batteryIcon.svg" width={24} height={24} alt="SoyMomo Logo" />
          </div>
          <div className={styles.textContainer}>
            <h1 className={styles.title}>Historial batería</h1>
            <p className={styles.subtitle}>Baterías</p>
          </div>
        </div>
        <div onClick={handleRefresh} className={sharedStyles.refreshContainer}>
          <img src="/images/tableIcons/cs-refreshIcon.svg" className={sharedStyles.refreshImg} alt="Refresh Icon" />
        </div>
      </div>

      {/* Filtros y botones integrados en el componente */}
      <div style={{ padding: '1rem' }}>
        <Row gutter={[16, 16]}>
          <Col>
            <label style={{ marginRight: '0.5rem' }}>Desde:</label>
            <DatePicker
              value={fromDate ? dayjs(fromDate) : null}
              onChange={(date) => setFromDate(date ? date.toISOString() : null)}
              disabledDate={disableFutureDates}
              allowClear={false} // No permite borrar el input
              inputReadOnly={true} // No permite escribir en el campo
            />
          </Col>
          <Col>
            <label style={{ marginRight: '0.5rem' }}>Hasta:</label>
            <DatePicker
              value={toDate ? dayjs(toDate) : null}
              onChange={(date) => setToDate(date ? date.toISOString() : null)}
              disabledDate={disableFutureDates}
              allowClear={false} // No permite borrar el input
              inputReadOnly={true} // No permite escribir en el campo
            />
          </Col>
          <Col>
            <Button 
              onClick={fetchBatteryHistory} 
              style={{ marginLeft: '2rem', marginRight: '0.5rem' }}  
              disabled={isRangeTooLong} // Solo se deshabilita si el rango supera 7 días
            >
              Buscar
            </Button>
            <Button onClick={resetFilters}>Restablecer</Button>
          </Col>
        </Row>

        {/* Mensaje de advertencia si el rango es mayor a 7 días */}
        {isRangeTooLong && (
          <div style={{ marginTop: '1rem' }}>
            <Alert 
              message="Rango de fechas no permitido"
              description="El rango seleccionado no puede ser mayor a 7 días. Por favor, selecciona un periodo más corto."
              type="error"
              showIcon
              style={{ borderRadius: '8px', padding: '10px' }}
            />
          </div>
        )}
      </div>

      {/* Contenido del gráfico o mensaje cuando no hay datos */}
      {data.length === 0 ? (
        <div className={styles.noDataContainer} style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '1rem'
        }}>
          <img 
            src="/images/cs-batteryIcon.svg" 
            width={48} 
            height={48} 
            alt="Battery Icon"
            style={{ opacity: 0.5, marginBottom: '1rem' }}
          />
          <p style={{
            fontSize: '1.1rem',
            color: '#666',
            textAlign: 'center',
            margin: 0
          }}>No hay datos de batería cargados</p>
          <p style={{
            fontSize: '0.9rem',
            color: '#999',
            textAlign: 'center',
            marginTop: '0.5rem'
          }}>Selecciona un rango de fechas y haz clic en buscar</p>
        </div>
      ) : (
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData} maxBarSize={30} barGap={5} barCategoryGap={15}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line dataKey="battery" stroke="#603BB0" name="Nivel de batería (%)" dot={{ r: 0 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
