import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import BatteryInfo from '../../models/Tablet/BatteryInfo';
import type Tablet from '../../models/Tablet/Tablet';

@injectable()
export class BatteryInfoService {
  async getBatteryHistory({
    tablet,
    from,
    to,
  }: {
    tablet: Tablet;
    from: string;
    to: string;
  }) {
    const query = new Parse.Query(BatteryInfo);
    query.equalTo('tablet', tablet);
    query.greaterThanOrEqualTo('createdAt', new Date(from));
    query.lessThanOrEqualTo('createdAt', new Date(to));
    query.descending('createdAt');
    const results: BatteryInfo[] = (
      await query.find({ useMasterKey: true })
    ).map((result) => result.fromParseObject(result));
    return results;
  }
}
