import Parse from 'parse/node';

import Wearer from './Wearer';

export default class WatchWearer extends Parse.Object {
  static className = 'WatchWearer';

  constructor() {
    super('WatchWearer');
  }

  get watch1(): Wearer {
    return this.get('watch1');
  }

  set watch1(value: Wearer) {
    this.set('watch1', value);
  }

  get watch2(): Wearer {
    return this.get('watch2');
  }

  set watch2(value: Wearer) {
    this.set('watch2', value);
  }

  get isWatch1Approved(): boolean {
    return this.get('isWatch1Approved');
  }

  set isWatch1Approved(value: boolean) {
    this.set('isWatch1Approved', value);
  }

  get isWatch2Approved(): boolean {
    return this.get('isWatch2Approved');
  }

  set isWatch2Approved(value: boolean) {
    this.set('isWatch2Approved', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): WatchWearer {
    this.id = parseObject.id;
    this.isWatch1Approved = parseObject.get('isWatch1Approved');
    this.isWatch2Approved = parseObject.get('isWatch2Approved');
    if (parseObject.get('watch1')) {
      const wearer = new Wearer();
      this.watch1 = wearer.fromParseObject(parseObject.get('watch1'));
    }
    if (parseObject.get('watch2')) {
      const wearer = new Wearer();
      this.watch2 = wearer.fromParseObject(parseObject.get('watch2'));
    }
    return this;
  }
}

WatchWearer.register();
