import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import Tablet from '../../models/Tablet/Tablet';
import { notificationCodes } from '../../utils/notificationCodes';

const SEARCH_RESULTS_LIMIT = 100;

// El nombre de perfil y el email se buscan sin distinguir mayúsculas, y
// `contains` no lo permite: hay que armar el regex a mano, escapando lo que
// venga del usuario.
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@injectable()
export class TabletService {
  async getTabletInstalledApps({ objectId }: { objectId?: string }) {
    try {
      const installedApps = await Parse.Cloud.run(
        'fetchToDevice_InstalledApp',
        { objectId }
      );
      return installedApps;
    } catch (error) {
      return null;
    }
  }

  async handlePushCommand({
    objectId,
    command,
    params,
  }: {
    objectId: string;
    command: keyof typeof notificationCodes.pushToTablet;
    params: any;
  }) {
    try {
      const code = notificationCodes.pushToTablet[command];
      const result = await Parse.Cloud.run('sendPushCommand', {
        objectId,
        code,
        params,
      });
      return result;
    } catch (error) {
      return null;
    }
  }

  async getTabletByHidOrRecoveryEmail({
    objectId,
    hid,
    recoveryEmail,
  }: {
    objectId?: string;
    hid?: string;
    recoveryEmail?: string;
  }) {
    const query = new Parse.Query(Tablet);
    query.include('tablet');
    if (hid) {
      query.equalTo('hid', hid);
    } else if (recoveryEmail) {
      query.equalTo('recoveryEmail', recoveryEmail);
    } else if (objectId) {
      query.equalTo('objectId', objectId);
    }
    query.descending('updatedAt');
    let result: Tablet =
      (await query.first({ useMasterKey: true })) ?? new Tablet();
    if (!result.isNew()) {
      result = result.fromParseObject(result);
      return result;
    }
    return null;
  }

  async searchTablets({ queryStr }: { queryStr?: string }) {
    if (!queryStr) {
      return [];
    }

    const hidQuery = new Parse.Query(Tablet);
    const objectQuery = new Parse.Query(Tablet);
    const recoveryEmailQuery = new Parse.Query(Tablet);
    const profileNameQuery = new Parse.Query(Tablet);

    const caseInsensitive = new RegExp(escapeRegExp(queryStr), 'i');

    hidQuery.contains('hid', queryStr);
    objectQuery.contains('objectId', queryStr);
    recoveryEmailQuery.matches('recoveryEmail', caseInsensitive);
    profileNameQuery.matches('profileName', caseInsensitive);

    const orQuery = Parse.Query.or(
      hidQuery,
      objectQuery,
      recoveryEmailQuery,
      profileNameQuery
    );

    orQuery.descending('updatedAt');
    orQuery.limit(SEARCH_RESULTS_LIMIT);
    orQuery.select(
      'objectId',
      'hid',
      'profileName',
      'recoveryEmail',
      'hardwareModel'
    );

    const results: Tablet[] = (await orQuery.find({ useMasterKey: true })).map(
      (result) => result.fromParseObject(result)
    );
    return results;
  }

  async updateTabletUserInformation({
    hid,
    profileName,
    recoveryEmail,
    pin,
  }: {
    hid?: string;
    profileName?: string;
    recoveryEmail?: string;
    pin?: string;
  }) {
    const tablet = await this.getTabletByHidOrRecoveryEmail({
      hid,
      recoveryEmail,
    });

    if (!tablet) {
      return null;
    }
    if (profileName) {
      tablet.profileName = profileName;
    }
    if (pin) {
      tablet.set('pin', pin);
    }
    if (recoveryEmail) {
      tablet.recoveryEmail = recoveryEmail;
    }
    const result = await tablet.save(null, { useMasterKey: true });
    return result;
  }

  async updateParentalControlSettings({
    hid,
    browserAllowed,
    remoteBlocked,
    smartDetectionEnabled,
    profanityDetectionEnabled,
  }: {
    hid?: string;
    browserAllowed?: boolean;
    remoteBlocked?: boolean;
    smartDetectionEnabled?: boolean;
    profanityDetectionEnabled?: boolean;
  }) {
    const tablet = await this.getTabletByHidOrRecoveryEmail({
      hid,
    });

    if (!tablet) {
      return null;
    }
    const result = await tablet.save(
      {
        browserAllowed,
        remoteBlocked,
        smartDetectionEnabled,
        profanityDetectionEnabled,
      },
      { useMasterKey: true }
    );
    return result;
  }
}
