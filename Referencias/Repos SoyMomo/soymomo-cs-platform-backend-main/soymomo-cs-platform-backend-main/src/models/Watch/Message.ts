import type { File } from 'parse/node';
import Parse from 'parse/node';

import User from './User';
import Wearer from './Wearer';

export default class Message extends Parse.Object {
  static className = 'Message';

  constructor() {
    super('Message');
  }

  get from(): User {
    return this.get('from');
  }

  set from(value: User) {
    this.set('from', value);
  }

  get text(): string {
    return this.get('text');
  }

  set text(value: string) {
    this.set('text', value);
  }

  get audio(): File {
    return this.get('audio');
  }

  set audio(value: File) {
    this.set('audio', value);
  }

  get image(): File {
    return this.get('image');
  }

  set image(value: File) {
    this.set('image', value);
  }

  get watch(): Wearer {
    return this.get('watch');
  }

  set watch(value: Wearer) {
    this.set('watch', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): Message {
    this.id = parseObject.id;
    this.text = parseObject.get('text');
    if (parseObject.get('from')) {
      const user = new User();
      this.from = user.fromParseObject(parseObject.get('from'));
    }
    if (parseObject.get('audio')) {
      this.audio = parseObject.get('audio');
    }
    if (parseObject.get('image')) {
      this.image = parseObject.get('image');
    }
    if (parseObject.get('watch')) {
      const wearer = new Wearer();
      this.watch = wearer.fromParseObject(parseObject.get('watch'));
    }
    return this;
  }
}

Message.register();
