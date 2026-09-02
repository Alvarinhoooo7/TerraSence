import axios from 'axios';

/**
 * @typedef {Object} EntelDevice
 * @property {string} iccid
 * @property {string} msisdn
 * @property {string} imei
 * @property {string} status
 * @property {string} ratePlan
 * @property {string} communicationPlan
 * @property {string} dateActivated
 * @property {string} dateUpdated
 * @property {string} dateShipped
 * @property {string} deviceID
 * @property {number} ctdDataUsage
 * @property {number} ctdVoiceUsage
 */

/**
 * Fetches device information from Entel API
 * @param {string} iccId - The ICCID of the device
 * @param {string} token - JWT token for authentication
 * @returns {Promise<EntelDevice>}
 */
export const fetchEntelDevice = async (iccId, token) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_BACKEND_HOST}/api/v1/entel/fetch-device`,
      { iccId },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data.data;
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error('ICCID es requerido');
    }
    throw new Error('Error al obtener datos del dispositivo');
  }
}; 