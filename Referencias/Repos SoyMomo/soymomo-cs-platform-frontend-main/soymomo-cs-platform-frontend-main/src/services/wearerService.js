import axios from 'axios';

export const getWearer = async (params, token) => {
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/getWearerByDeviceIdOrImei', { params, headers: { Authorization: `Bearer ${token}` } });
    return response;
}

export const getContacts = async (params, token) => {
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/getContacts', { params, headers: { Authorization: `Bearer ${token}` } });
    let finalResponse;
    if (response.data.data) {
      finalResponse = response.data.data.map((contact, index) => {
        //contact.sos = contact.sos ? "Si" : "No"
        return {
          ...contact,
          key: contact.objectId || index
        }
      })
    }
    return finalResponse ?? [];
  }

  // export const updateContacts = async (watchUserObjectId, active, token) => {
  //   const body = {
  //     objectId: watchUserObjectId,
  //     active
  //   }
  //   const response = await axios.put(
  //     process.env.REACT_APP_BACKEND_HOST + '/wearer/watchU',
  //     body,
  //     {
  //       headers: { Authorization: `Bearer ${token}` }
  //     }
  //   );
  //   return response
  // }


export const getWatchUsers = async (params, token) => {
    try {
        const response = await axios.get(
            process.env.REACT_APP_BACKEND_HOST + '/wearer/watchUser/getWatchUserByEmailOrDeviceIdOrImei', 
            { 
                params, 
                headers: { Authorization: `Bearer ${token}` } 
            }
        );
        
        if (!response.data || !response.data.data) {
            return [];
        }

        let fetchedUsers = response.data.data.users || [];
        const fetchedWatchUsers = response.data.data.results || [];

        fetchedUsers = fetchedUsers.map((user) => {
            const currentWu = fetchedWatchUsers.find((watchUser) => watchUser.user.objectId === user.objectId);
            return {
                ...user,
                key: user.objectId,
                id: user.objectId,
                watchUserId: currentWu?.objectId || '',
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                facebook: user.fb ? "Si" : "No",
                authorized: currentWu?.active ? "Si" : "No"
            };
        });

        return fetchedUsers;
    } catch (error) {
        throw error;
    }
}

export const getFriends = async (params, deviceId, imei, token) => {
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/getWearerFriends', { params, headers: { Authorization: `Bearer ${token}` } });
    let fetchedFriends = response.data.data
    for (let i = 0; i < fetchedFriends.length; i++) {
      const wearer1 = (await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/getWearerByObjectId', { headers: { Authorization: `Bearer ${token}` },  params: { objectId: fetchedFriends[i].watch2.objectId } })).data.data[0];
      const wearer2 = (await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/getWearerByObjectId', { headers: { Authorization: `Bearer ${token}` },  params: { objectId: fetchedFriends[i].watch2.objectId } })).data.data[0];
      if (wearer1.deviceId === deviceId || wearer1.imei === imei) {
        fetchedFriends[i].name = wearer2.firstName + " " + wearer2.lastName
        fetchedFriends[i].deviceId = wearer2.deviceId
      } else {
        fetchedFriends[i].name = wearer1.firstName + " " + wearer1.lastName
        fetchedFriends[i].deviceId = wearer1.deviceId
      }
      fetchedFriends[i].key = fetchedFriends[i].objectId || i;
      fetchedFriends[i].id = i
      fetchedFriends[i].approval1 = fetchedFriends[i].isWatch1Approved ? "Aprobado" : "No aprobado"
      fetchedFriends[i].approval2 = fetchedFriends[i].isWatch2Approved ? "Aprobado" : "No aprobado"
    }
    return fetchedFriends;
  }

export const getChatUser = async (params, token) => {
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/chatUser', { params, headers: { Authorization: `Bearer ${token}` } });
    const messages = response.data.data
      .map((row, index) => {
        // Formatear la fecha a dd/mm/aaaa hh:mm
        const formatDate = (dateString) => {
          const date = new Date(dateString);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}`;
        };

        return {
          key: index,
          sender: row.sender,
          type: row.type,
          date: formatDate(row.date),
          source: row.source,
          status: row.status,
        }
      });
    return messages;
  }

  export const getChatWearer = async (params, token) => {
    const response = await axios.get(process.env.REACT_APP_BACKEND_HOST + '/wearer/chatWearer', { params, headers: { Authorization: `Bearer ${token}` } });
    const messages = response.data.data
      .filter(row => row.chatWearer.type === "text")  // Filter first
      .map((row, index) => {                                // Then map
        const chatWearer = row.chatWearer
        const sender = row.sender
        return {
            key: index,
          message: chatWearer.text,
          sender: `${sender.firstName ?? ""} ${sender.lastName ?? ""}`,
          date: chatWearer.createdAt,
          from: "watch",
        }
      });
    return messages
  }

export const getBatteryHistory = async (deviceId, token, from = null, to = null) => {
  try {
    const params = { deviceId };

    // Si `from` y `to` no son proporcionados, el backend aplicará la restricción por defecto
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();

    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/wearer/historyBattery`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });

    return response.data.data;
  } catch (error) {
    console.error("Error fetching battery history:", error);
    return [];
  }
};

  export const getSimInfo = async (objectId, imei, iccId, token) => {
    let params;

    if (objectId) {
      params = { objectId }
    } else if (iccId) {
      params = { iccId }
    } else if (imei) {
      params = { imei }
    } else {
      return;
    }
    const response = await axios.get(
      process.env.REACT_APP_BACKEND_HOST + '/sim/simInfo',
      {
        params: params,
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response
  }

  export const updateWatchUserStatus = async (watchUserObjectId, active, token) => {
    const body = {
      objectId: watchUserObjectId,
      active
    }
    const response = await axios.put(
      process.env.REACT_APP_BACKEND_HOST + '/wearer/watchUser',
      body,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response
  }

  export const deleteWatchUser = async (watchUserObjectId, token) => {
    const response = await axios.delete(
      process.env.REACT_APP_BACKEND_HOST + '/wearer/watchUser/deleteWatchUser',
      {
        params: { objectId: watchUserObjectId },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response
  }

  export const changeAdmin = async(deviceId, watchUserObjectId, token) => {
    const body = {
      deviceId,
      newAdminId: watchUserObjectId
    }
    const response = await axios.put(
      process.env.REACT_APP_BACKEND_HOST + '/wearer/changeAdmin',
      body,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response
  }

  export const editWearer = async (objectId, attributes, token) => {
    const response = await axios.put(
      process.env.REACT_APP_BACKEND_HOST + '/wearer/editWearer',
      {attributes, objectId},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response
  }

export const updateWearerSettings = async (deviceId, attributes, token) => {
    const response = await axios.post(
      process.env.REACT_APP_BACKEND_HOST + '/wearer/updateWearerSettings',
      {...attributes, deviceId},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response
}
export const createContact = async (params, token) => {
  const response = await axios.post(
    process.env.REACT_APP_BACKEND_HOST + '/wearer/createContact',
    params,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response;
};

export const updateContact = async (params, token) => {

  
  const response = await axios.put(
    process.env.REACT_APP_BACKEND_HOST + '/wearer/updateContact',
    params,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response
}

export const deleteContact = async (params, token) => {

  const response = await axios.delete(
    process.env.REACT_APP_BACKEND_HOST + '/wearer/deleteContact',
    {
      headers: { Authorization: `Bearer ${token}` },
      data: params 
    }
  );
  return response;
}

export const getWatchBuildInfo = async (watchId, token) => {
  const response = await axios.get(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/buildInfo/${watchId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response;
};

export const getWatchInstalledApps = async (watchId, token) => {
  const response = await axios.get(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/buildInfo/${watchId}/installed-apps`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response;
};

export const getWatchPushyPresence = async (watchId, token) => {
  const response = await axios.get(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/pushyPresence/${watchId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};

export const getWatchConnectivity = async (watchId, token) => {
  const response = await axios.get(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/connectivity/${watchId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};

export const repushSpace2Credentials = async (watchId, token) => {
  const response = await axios.post(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/connectivity/space2/repush-credentials`,
    { watchId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};

export const installAuthManagerApk = async (watchId, token) => {
  const response = await axios.post(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/connectivity/space34/install-auth-manager`,
    { watchId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};

export const getApnCountries = async (token) => {
  const response = await axios.get(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/apn/countries`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};

// Sin pais el backend devuelve solo el track del reloj, sin opciones.
export const getApnCatalog = async (watchId, token, country) => {
  const query = country ? `?country=${encodeURIComponent(country)}` : '';
  const response = await axios.get(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/apn/${watchId}${query}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};

export const sendApn = async (watchId, apnId, token) => {
  const response = await axios.post(
    `${process.env.REACT_APP_BACKEND_HOST}/wearer/apn/send`,
    { watchId, apnId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response;
};
