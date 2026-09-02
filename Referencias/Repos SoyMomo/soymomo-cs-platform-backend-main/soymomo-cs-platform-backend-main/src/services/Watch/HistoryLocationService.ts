import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import Location from '../../models/Watch/Location';
import LocationHistory from '../../models/Watch/LocationHistory';

@injectable()
export class HistoryLocationService {
  async getLocationHistory({
    deviceId,
    from,
    to,
  }: {
    deviceId: string;
    from?: string;
    to?: string;
  }) {
    const query = new Parse.Query(Location);
    query.equalTo('deviceId', deviceId);
    if (from) {
      query.greaterThanOrEqualTo('createdAt', new Date(from));
    }
    if (to) {
      query.lessThanOrEqualTo('createdAt', new Date(to));
    }
    query.descending('createdAt');
    const results: Location[] = (await query.find({ useMasterKey: true })).map(
      (result) => result.fromParseObject(result)
    );
    return results;
  }

  async getLocationBatteryHistory({
    deviceId,
    from,
    to,
  }: {
    deviceId: string;
    from?: Date;
    to?: Date;
  }) {
    const limit = 1000; // Parse Server max is commonly 1000 (Back4App usually supports it)
    const results: any[] = [];
    let cursor: Date | undefined = from;

    // eslint-disable-next-line no-constant-condition -- cursor-based pagination loop
    while (true) {
      const q = new Parse.Query(LocationHistory);
      q.equalTo('deviceId', deviceId);

      q.greaterThanOrEqualTo('battery', 0);

      if (cursor) q.greaterThan('createdAt', cursor);
      if (to) q.lessThanOrEqualTo('createdAt', to);

      q.ascending('createdAt');
      q.limit(limit);

      q.select(['deviceId', 'battery', 'createdAt']);

      // eslint-disable-next-line no-await-in-loop -- sequential pagination required
      const page = await q.find({ useMasterKey: true });
      if (page.length === 0) break;

      results.push(...page);

      const last = page[page.length - 1]!.get('createdAt') as Date | undefined;
      if (!last) break;
      cursor = last;

      if (page.length < limit) break;
    }

    return results.map((record) => ({
      deviceId: record.get('deviceId'),
      battery: record.get('battery'),
      timestamp: record.get('createdAt')
        ? record.get('createdAt').toISOString()
        : '',
    }));
  }
}
