import Parse from 'parse/node';

export default class ChatWearer extends Parse.Object {
  static className = 'ChatWearer';

  constructor() {
    super('ChatWearer');
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): ChatWearer {
    this.id = parseObject.id;
    return this;
  }
}

ChatWearer.register();
