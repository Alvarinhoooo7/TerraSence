import Parse from 'parse/node';

import User from './User';
import Wearer from './Wearer';

export default class ChatUser extends Parse.Object {
  static className = 'ChatUser';

  constructor() {
    super('ChatUser');
  }

  get user(): User {
    return this.get('user');
  }

  set user(value: User) {
    this.set('user', value);
  }

  get type(): string {
    return this.get('type');
  }

  set type(value: string) {
    this.set('type', value);
  }

  get watch(): Wearer {
    return this.get('watch');
  }

  set watch(value: Wearer) {
    this.set('watch', value);
  }

  get sender(): string {
    return this.get('sender');
  }

  set sender(value: string) {
    this.set('sender', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): ChatUser {
    this.id = parseObject.id;
    this.type = parseObject.get('type');
    this.sender = parseObject.get('sender');
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

ChatUser.register();
