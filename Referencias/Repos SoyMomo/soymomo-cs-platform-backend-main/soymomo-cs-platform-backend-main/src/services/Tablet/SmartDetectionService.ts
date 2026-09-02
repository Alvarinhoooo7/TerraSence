import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import SmartDetection from '../../models/Tablet/SmartDetection';
import type Tablet from '../../models/Tablet/Tablet';

@injectable()
export class SmartDetectionService {
  async getSmartDetections({
    tablet,
    from,
    to,
    limit,
  }: {
    tablet: Tablet;
    from: string;
    to: string;
    limit?: number;
  }) {
    const query = new Parse.Query(SmartDetection);
    query.equalTo('tablet', tablet);
    query.greaterThanOrEqualTo('createdAt', new Date(from));
    query.lessThanOrEqualTo('createdAt', new Date(to));
    if (limit) {
      query.limit(limit);
    }
    query.descending('createdAt');
    const results: SmartDetection[] = (
      await query.find({ useMasterKey: true })
    ).map((result) => result.fromParseObject(result));
    return results;
  }
}
