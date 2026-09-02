import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import Tablet from '../../models/Tablet/Tablet';
import TabletUser from '../../models/Tablet/TabletUser';

@injectable()
export class TabletUserService {
  async getTabletUsers() {
    const query = new Parse.Query(TabletUser);
    query.include('tablet');
    const results: TabletUser[] = (
      await query.find({ useMasterKey: true })
    ).map((result) => result.fromParseObject(result));
    return results;
  }

  async getTabletUserByHidOrRecoveryEmail({
    recoveryEmail,
    hid,
  }: {
    recoveryEmail?: string;
    hid?: string;
  }) {
    const query = new Parse.Query(TabletUser);
    query.include('tablet');
    query.include('user');
    query.include('user.installation');
    const tabletQuery = new Parse.Query(Tablet);
    if (hid) {
      tabletQuery.equalTo('hid', hid);
      query.matchesQuery('tablet', tabletQuery);
    } else {
      tabletQuery.equalTo('recoveryEmail', recoveryEmail);
      query.matchesQuery('tablet', tabletQuery);
    }
    const results: TabletUser[] = (
      await query.find({ useMasterKey: true })
    ).map((result) => result.fromParseObject(result));
    return results;
  }
}
