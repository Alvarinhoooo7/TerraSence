import Parse from 'parse/node';
import { container, injectable } from 'tsyringe';

import ChatWearer from '../../models/Watch/ChatWearer';
import { WearerService } from './WearerService';

@injectable()
export class ChatWearerService {
  async getChatUser({
    deviceId,
    imei,
    objectId,
  }: {
    deviceId?: string;
    imei?: string;
    objectId?: string;
  }) {
    let watch;
    const wearerService = container.resolve(WearerService);
    if (objectId) {
      watch = await wearerService.getWearerByObjectId({ objectId });
    } else {
      watch = await wearerService.getWearerByDeviceIdOrImei({
        deviceId,
        imei,
      });
    }
    if (!watch) {
      return [];
    }
    const wearer = watch[0];
    const query1 = new Parse.Query(ChatWearer).equalTo('reciever', wearer);
    const query2 = new Parse.Query(ChatWearer).equalTo('sender', wearer);
    const query = Parse.Query.or(query1, query2);
    query.include('sender');
    query.include('receiver');
    const results: ChatWearer[] = (
      await query.find({ useMasterKey: true })
    ).map((result) => result.fromParseObject(result));
    return results;
  }
}
