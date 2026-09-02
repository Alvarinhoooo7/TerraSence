/* eslint-disable prettier/prettier */
import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import HistoryBattery_V3 from '../../models/Watch/HistoryBattery_V3';

@injectable()
export class HistoryBatteryService {
  async getBatteryHistory({ deviceId, from, to }: { deviceId: string; from?: Date; to?: Date }) {
    const historyQuery = new Parse.Query(HistoryBattery_V3);
    historyQuery.equalTo('deviceId', deviceId);

    if (from) {
      historyQuery.greaterThanOrEqualTo('createdAt', from);
    }
    if (to) {
      historyQuery.lessThanOrEqualTo('createdAt', to);
    }
    historyQuery.ascending('createdAt');

    const historyResults = await historyQuery.find({ useMasterKey: true });

    const results: { deviceId: string; battery: number; timestamp: string }[] = [];

    historyResults.forEach((record) => {
      const batteryData = record.get('battery') || [];
      if (Array.isArray(batteryData)) {
        batteryData.flat().forEach((b: { createdAt: string; battery: number }) => {
          results.push({
            deviceId: record.get('deviceId'),
            battery: b.battery,
            timestamp: b.createdAt,
          });
        });
      }
    });

    return results;
  }
}
  