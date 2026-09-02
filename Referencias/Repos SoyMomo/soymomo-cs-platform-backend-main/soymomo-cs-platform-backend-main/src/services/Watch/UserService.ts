import Parse from 'parse/node';
import { injectable } from 'tsyringe';

import User from '../../models/Watch/User';

@injectable()
export class UserService {
  async getUserByObjectId(objectId: string) {
    const query = new Parse.Query(User);
    const user: User = await query.get(objectId, { useMasterKey: true });
    return user;
  }
}
