import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import User from '../../models/Watch/User';
import WatchWearer from '../../models/Watch/WatchWearer';
import Wearer from '../../models/Watch/Wearer';

@injectable()
export class WearerService {
  async getWearerFriends({
    deviceId,
    imei,
  }: {
    deviceId?: string;
    imei?: string;
  }) {
    const wearer = await this.getWearerByDeviceIdOrImei({ deviceId, imei });
    if (wearer.length > 1 || wearer.length === 0 || !wearer[0]) {
      return null;
    }

    const watch1 = wearer[0];
    const query1 = new Parse.Query(WatchWearer)
      .include('watch1')
      .include('watch2')
      .equalTo('watch1', watch1)
      .equalTo('isWatch1Approved', true)
      .equalTo('isWatch2Approved', true);
    const query2 = new Parse.Query(WatchWearer)
      .include('watch1')
      .include('watch2')
      .equalTo('watch2', watch1)
      .equalTo('isWatch2Approved', true)
      .equalTo('isWatch1Approved', true);
    const query = Parse.Query.or(query1, query2);
    const results: WatchWearer[] = (
      await query.find({ useMasterKey: true })
    ).map((result) => result.fromParseObject(result));
    return results;
  }

  async changeWearerUserInCharge({
    deviceId,
    imei,
    userInChargeId,
  }: {
    deviceId?: string;
    imei?: string;
    userInChargeId: string;
  }) {
    const wearer = await this.getWearerByDeviceIdOrImei({ deviceId, imei });
    if (wearer.length > 1 || wearer.length === 0 || !wearer[0]) {
      return null;
    }

    const wearerToUpdate = wearer[0];
    const userInCharge = await new Parse.Query(Parse.User).get(userInChargeId);
    const user = new User().fromParseObject(userInCharge);
    wearerToUpdate.userInCharge = user;
    await wearerToUpdate.save(null, { useMasterKey: true });
    return wearerToUpdate;
  }

  async getWearerByObjectId({ objectId }: { objectId?: string }) {
    const query = new Parse.Query(Wearer);
    query.include('settings');
    query.include('userInCharge');
    query.include('lastKnownLocation');
    query.equalTo('objectId', objectId);
    const results: Wearer[] = (await query.find({ useMasterKey: true })).map(
      (result) => result.fromParseObject(result)
    );
    return results;
  }

  async getWearerByDeviceIdOrImei({
    deviceId,
    imei,
  }: {
    deviceId?: string;
    imei?: string;
  }) {
    const query = new Parse.Query(Wearer);
    query.include('settings');
    // Como contiene pointers no se carga el include
    // Si se quiere usar se debe incluir los campos específicos a usar
    query.include('userInCharge');
    query.include('lastKnownLocation');
    if (deviceId) {
      query.equalTo('deviceId', deviceId);
    } else if (imei) {
      query.equalTo('imei', imei);
    }
    const results: Wearer[] = (await query.find({ useMasterKey: true })).map(
      (result) => result.fromParseObject(result)
    );
    return results;
  }

  async getWearerByString({ queryStr }: { queryStr?: string }) {
    const deviceQuery = new Parse.Query(Wearer);
    const imeiQuery = new Parse.Query(Wearer);
    const objectQuery = new Parse.Query(Wearer);
    const phoneQuery = new Parse.Query(Wearer);
    // deviceQuery.include('settings');
    // imeiQuery.include('settings');
    // objectQuery.include('settings');
    // phoneQuery.include('settings');

    // Si no hay un string que comparar retorno todos los objetos
    if (!queryStr) {
      const allQuery = new Parse.Query(Wearer);
      // allQuery.include('settings');
      allQuery.descending('updatedAt');
      const results: Wearer[] = (
        await allQuery.find({ useMasterKey: true })
      ).map((result) => result.fromParseObject(result));
      return results;
    }

    deviceQuery.contains('deviceId', queryStr);
    imeiQuery.contains('imei', queryStr);
    objectQuery.contains('objectId', queryStr);
    phoneQuery.contains('phone', queryStr);

    const queries = [deviceQuery, imeiQuery, objectQuery, phoneQuery];

    // Fallback: if queryStr looks like an IMEI (15 digits), derive the deviceId
    // by skipping the first 4 digits and removing the last digit, then also
    // search by that derived deviceId.
    if (/^\d{15}$/.test(queryStr)) {
      const derivedDeviceId = queryStr.slice(4, -1);
      const derivedDeviceIdQuery = new Parse.Query(Wearer);
      derivedDeviceIdQuery.equalTo('deviceId', derivedDeviceId);
      queries.push(derivedDeviceIdQuery);
    }

    const orQuery = Parse.Query.or(...queries);

    orQuery.descending('updatedAt');
    orQuery.select(
      'objectId',
      'deviceId',
      'imei',
      'phone',
      'firstName',
      'lastName'
    );
    // orQuery.include('settings');

    const results: Wearer[] = (await orQuery.find({ useMasterKey: true })).map(
      (result) => result.fromParseObject(result)
    );
    return results;
  }

  async powerOff({ deviceId }: { deviceId: string }) {
    const result = await Parse.Cloud.run('wPowerOff', { deviceId });
    return result;
  }

  async findWatch({ deviceId }: { deviceId: string }) {
    const result = await Parse.Cloud.run('wFind', { deviceId });
    return result;
  }

  async factoryReset({ deviceId }: { deviceId: string }) {
    const result = await Parse.Cloud.run('factoryResetMomo', {
      deviceId,
      command: 'FACTORY',
    });
    return result;
  }

  async chargeSettings({ deviceId }: { deviceId: string }) {
    const result = await Parse.Cloud.run('chargeConfiguration', {
      deviceId,
    });
    return result;
  }

  // editar string wChargeContacts dependiendo de la funcion que haga el pancho
  async chargeContacts({ deviceId }: { deviceId: string }) {
    const result = await Parse.Cloud.run('wContacts', { deviceId });
    return result;
  }

  async getContacts({ deviceId, imei }: { deviceId?: string; imei?: string }) {
    const wearers = await this.getWearerByDeviceIdOrImei({ deviceId, imei });
    const wearer = wearers[0];
    let contacts;
    const deviceModel = wearer?.hardwareModel;

    if (wearer) {
      if (
        deviceModel === 'Soymomo_Space_Lite_v1' ||
        deviceModel === 'Soymomo_Space_v1'
      ) {
        const contactsRelation = wearer.relation('contacts');
        const contactsQuery = contactsRelation.query();
        contacts = await contactsQuery.find({ useMasterKey: true });
      } else if (
        deviceModel === 'Soymomo_Space_v2' ||
        deviceModel === 'Soymomo_Space_v3' ||
        deviceModel === 'Soymomo_Space_v4'
      ) {
        const PhoneContact = Parse.Object.extend('PhoneContact');
        const query = new Parse.Query(PhoneContact);
        query.equalTo('watch', wearer);
        contacts = await query.find({ useMasterKey: true });
      }
    }
    return contacts;
  }

  async updatePhoneContact({
    objectId,
    name,
    phone,
    sos,
  }: {
    objectId: string;
    name?: string;
    phone?: string;
    sos?: boolean;
  }) {
    const PhoneContact = Parse.Object.extend('PhoneContact');
    const query = new Parse.Query(PhoneContact);
    const phoneContactToUpdate = await query.get(objectId, {
      useMasterKey: true,
    });

    if (name) {
      phoneContactToUpdate.set('name', name);
    }

    if (phone) {
      phoneContactToUpdate.set('phone', phone);
    }

    if (sos) {
      const wearer = phoneContactToUpdate.get('watch');

      const contactQuery = new Parse.Query(PhoneContact);
      contactQuery.equalTo('watch', wearer);
      const contacts = await contactQuery.find({ useMasterKey: true });

      const sosContact = contacts.find(
        (contact) => contact.get('sos') === true
      );

      if (sosContact && sosContact.id !== objectId) {
        sosContact.set('sos', false);
        await sosContact.save(null, { useMasterKey: true });
      }
    }

    if (typeof sos === 'boolean') {
      phoneContactToUpdate.set('sos', sos);
    }

    await phoneContactToUpdate.save(null, { useMasterKey: true });
    return phoneContactToUpdate;
  }

  async updateContact({
    objectId,
    name,
    phone,
    sos,
  }: {
    objectId: string;
    name?: string;
    phone?: string;
    sos?: boolean;
  }) {
    const Contact = Parse.Object.extend('Contact');
    const query = new Parse.Query(Contact);
    const contactToUpdate = await query.get(objectId, { useMasterKey: true });

    if (name) {
      contactToUpdate.set('name', name);
    }
    if (phone) {
      contactToUpdate.set('phone', phone);
    }

    if (sos) {
      const wearer = contactToUpdate.get('watch');

      const contactQuery = new Parse.Query(Contact);
      contactQuery.equalTo('watch', wearer);
      const contacts = await contactQuery.find({ useMasterKey: true });

      const sosContact = contacts.find(
        (contact) => contact.get('sos') === true
      );

      if (sosContact && sosContact.id !== objectId) {
        sosContact.set('sos', false);
        await sosContact.save(null, { useMasterKey: true });
      }
    }

    if (typeof sos === 'boolean') {
      contactToUpdate.set('sos', sos);
    }

    await contactToUpdate.save(null, { useMasterKey: true });
    return contactToUpdate;
  }

  async deletePhoneContact({ objectId }: { objectId: string }) {
    const PhoneContact = Parse.Object.extend('PhoneContact');
    const query = new Parse.Query(PhoneContact);

    const phoneContactToDestroy = await query.get(objectId, {
      useMasterKey: true,
    });

    if (phoneContactToDestroy.get('sos') === true) {
      throw new Error('No se puede eliminar un contacto SOS.');
    }

    await phoneContactToDestroy.destroy({ useMasterKey: true });

    return `Contacto con ID ${objectId} eliminado exitosamente y posiciones actualizadas.`;
  }

  async createContact({
    deviceId,
    imei,
    hardwareModel,
    name,
    phone,
    sos = false,
    chatEnabled = false,
  }: {
    deviceId?: string;
    imei?: string;
    hardwareModel: string;
    name: string;
    phone: string;
    sos?: boolean;
    chatEnabled?: boolean;
  }) {
    const wearers = await this.getWearerByDeviceIdOrImei({ deviceId, imei });
    const wearer = wearers[0];
    if (!wearer) {
      return null;
    }

    if (
      hardwareModel === 'Soymomo_Space_Lite_v1' ||
      hardwareModel === 'Soymomo_Space_v1'
    ) {
      const contactsRelation = wearer.relation('contacts');
      const existingContacts = await contactsRelation
        .query()
        .find({ useMasterKey: true });

      if (sos) {
        const existingSos = existingContacts.find((c) => c.get('sos') === true);
        if (existingSos) {
          existingSos.set('sos', false);
          await existingSos.save(null, { useMasterKey: true });
        }
      }

      const Contact = Parse.Object.extend('Contact');
      const newContact = new Contact();
      newContact.set('name', name);
      newContact.set('phone', phone);
      newContact.set('sos', sos);
      newContact.set('chatEnabled', chatEnabled);
      newContact.set('position', existingContacts.length);
      await newContact.save(null, { useMasterKey: true });

      contactsRelation.add(newContact);
      await wearer.save(null, { useMasterKey: true });

      return newContact;
    }

    if (
      hardwareModel === 'Soymomo_Space_v2' ||
      hardwareModel === 'Soymomo_Space_v3' ||
      hardwareModel === 'Soymomo_Space_v4'
    ) {
      const PhoneContact = Parse.Object.extend('PhoneContact');

      if (sos) {
        const existingSosQuery = new Parse.Query(PhoneContact);
        existingSosQuery.equalTo('watch', wearer);
        existingSosQuery.equalTo('sos', true);
        const existingSos = await existingSosQuery.first({
          useMasterKey: true,
        });
        if (existingSos) {
          existingSos.set('sos', false);
          await existingSos.save(null, { useMasterKey: true });
        }
      }

      const existingQuery = new Parse.Query(PhoneContact);
      existingQuery.equalTo('watch', wearer);
      const existingCount = await existingQuery.count({ useMasterKey: true });

      const newContact = new PhoneContact();
      newContact.set('name', name);
      newContact.set('phone', phone);
      newContact.set('sos', sos);
      newContact.set('chatEnabled', chatEnabled);
      newContact.set('position', existingCount);
      newContact.set('watch', wearer);
      await newContact.save(null, { useMasterKey: true });

      return newContact;
    }

    return null;
  }

  async deleteContact({ objectId }: { objectId: string }) {
    const Contact = Parse.Object.extend('Contact');
    const query = new Parse.Query(Contact);

    const contactToDestroy = await query.get(objectId, {
      useMasterKey: true,
    });

    if (contactToDestroy.get('sos') === true) {
      throw new Error('No se puede eliminar un contacto SOS.');
    }

    await contactToDestroy.destroy({ useMasterKey: true });

    return `Contacto con ID ${objectId} eliminado exitosamente y posiciones actualizadas.`;
  }

  async updateWearerUserInformation({
    deviceId,
    imei,
    firstName,
    lastName,
    phone,
    model,
  }: {
    deviceId?: string;
    imei?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    model?: number;
  }) {
    const wearer = await this.getWearerByDeviceIdOrImei({ deviceId, imei });
    if (wearer.length > 1 || wearer.length === 0 || !wearer[0]) {
      return null;
    }

    const wearerToUpdate = wearer[0];
    if (firstName) {
      wearerToUpdate.firstName = firstName;
    }
    if (lastName) {
      wearerToUpdate.lastName = lastName;
    }
    if (phone) {
      wearerToUpdate.phone = phone;
    }
    if (model) {
      wearerToUpdate.model = model;
    }
    await wearerToUpdate.save(null, { useMasterKey: true });
    return wearerToUpdate;
  }

  async updateWearerSettings({
    deviceId,
    imei,
    gpsFrequencySeconds,
    soundMode,
    batterySaveEnabled,
    language,
    timeZone,
    amPm,
    dialpadEnabled,
  }: {
    deviceId?: string;
    imei?: string;
    gpsFrequencySeconds?: number;
    soundMode?: number;
    batterySaveEnabled?: boolean;
    language?: string;
    timeZone?: string;
    amPm?: boolean;
    dialpadEnabled?: boolean;
  }) {
    const wearer = await this.getWearerByDeviceIdOrImei({ deviceId, imei });
    if (wearer.length > 1 || wearer.length === 0 || !wearer[0]) {
      return null;
    }

    const wearerToUpdate = wearer[0];

    if (gpsFrequencySeconds) {
      wearerToUpdate.settings.gpsFrequencySeconds = gpsFrequencySeconds;
    }
    if (soundMode) {
      wearerToUpdate.settings.soundMode = soundMode;
    }
    if (typeof batterySaveEnabled === 'boolean') {
      wearerToUpdate.settings.batterySaveEnabled = batterySaveEnabled;
    }
    if (language) {
      wearerToUpdate.settings.language = language;
    }
    if (timeZone) {
      wearerToUpdate.settings.timeZone = timeZone;
    }
    if (typeof amPm === 'boolean') {
      wearerToUpdate.settings.amPm = amPm;
    }
    if (typeof dialpadEnabled === 'boolean') {
      wearerToUpdate.settings.dialpadEnabled = dialpadEnabled;
    }
    await wearerToUpdate.settings.save(null, { useMasterKey: true });
    return wearerToUpdate.settings;
  }

  async sendMessageToWearer({
    deviceId,
    message,
  }: {
    deviceId: string;
    message: string;
  }) {
    await Parse.Cloud.run('wMessage', { deviceId, message });
  }

  async resetWearer({ deviceId }: { deviceId: string }) {
    const response = await Parse.Cloud.run(
      'resetWatchToDefaults',
      {
        deviceId,
      },
      { useMasterKey: true }
    );
    return response;
  }

  async swapWearers({
    originId,
    destinationId,
  }: {
    originId: string;
    destinationId: string;
  }) {
    const response = await Parse.Cloud.run(
      'swapWearers',
      {
        originId,
        destinationId,
      },
      { useMasterKey: true }
    );
    return response;
  }
}
