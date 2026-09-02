import Parse from 'parse/node';

import User from './User';
import UserPermission from './UserPermission';
import Wearer from './Wearer';

export default class WatchUser extends Parse.Object {
  static className = 'WatchUser';

  constructor() {
    super('WatchUser');
  }

  get user() {
    return this.get('user');
  }

  set user(value) {
    this.set('user', value);
  }

  get watch(): Wearer {
    return this.get('watch');
  }

  set watch(value: Wearer) {
    this.set('watch', value);
  }

  get active() {
    return this.get('active');
  }

  set active(value) {
    this.set('active', value);
  }

  get userPermission(): UserPermission {
    return this.get('userPermission');
  }

  set userPermission(value: UserPermission) {
    this.set('userPermission', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): WatchUser {
    this.id = parseObject.id;
    this.active = parseObject.get('active');
    if (parseObject.get('userPermission')) {
      const userPermission = new UserPermission();
      this.userPermission = userPermission.fromParseObject(
        parseObject.get('userPermission')
      );
    }
    if (parseObject.get('user')) {
      const user = new User();
      this.user = user.fromParseObject(parseObject.get('user'));
    }
    if (parseObject.get('watch')) {
      const wearer = new Wearer();
      this.watch = wearer.fromParseObject(parseObject.get('watch'));
    }
    return this;
  }
}

WatchUser.register();
