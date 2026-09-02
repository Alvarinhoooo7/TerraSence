import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import User from '../../models/Watch/User';
import WatchUser from '../../models/Watch/WatchUser';
import Wearer from '../../models/Watch/Wearer';

@injectable()
export class WatchUserService {
  async getWatchUsers() {
    const query = new Parse.Query(WatchUser);
    query.include('watch');
    query.include('user');
    const results: WatchUser[] = (await query.find({ useMasterKey: true })).map(
      (result) => result.fromParseObject(result)
    );
    return results;
  }

  async getWatchUserByEmailOrDeviceIdOrImei({
    email,
    deviceId,
    imei,
  }: {
    email?: string;
    deviceId?: string;
    imei?: string;
  }) {
    const query = new Parse.Query(WatchUser);
    let userQuery;
    let watchQuery;
    query.include('watch');
    query.include('user');
    if (deviceId) {
      watchQuery = new Parse.Query(Wearer);
      watchQuery.equalTo('deviceId', deviceId);
      query.matchesQuery('watch', watchQuery);
    } else if (imei) {
      watchQuery = new Parse.Query(Wearer);
      watchQuery.equalTo('imei', imei);
      query.matchesQuery('watch', watchQuery);
    } else {
      userQuery = new Parse.Query(User);
      userQuery.equalTo('email', email);
      query.matchesQuery('user', userQuery);
    }
    const results: WatchUser[] = (await query.find({ useMasterKey: true })).map(
      (result) => result.fromParseObject(result)
    );
    return results;
  }

  async updateWatchUser({
    reqId,
    accepted,
  }: {
    reqId: string;
    accepted: boolean;
  }) {
    const result = await Parse.Cloud.run('handleRequestCsPlatform', {
      reqId,
      accepted,
    });
    return result;
  }

  async getWatchUserByObjectId(objectId: string) {
    const query = new Parse.Query(WatchUser);
    query.include(['watch', 'user', 'watch.userInCharge']);
    query.equalTo('objectId', objectId);
    const result = await query.first({ useMasterKey: true });
    return result;
  }
}
