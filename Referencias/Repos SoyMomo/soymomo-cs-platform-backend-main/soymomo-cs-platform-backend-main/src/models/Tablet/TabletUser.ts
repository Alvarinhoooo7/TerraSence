import Parse from 'parse/node';

import Tablet from './Tablet';

export default class TabletUser extends Parse.Object {
  static className = 'TabletUser';

  constructor() {
    super('TabletUser');
  }

  get isActive(): boolean {
    return this.get('isActive');
  }

  set isActive(value: boolean) {
    this.set('isActive', value);
  }

  get tablet(): Tablet {
    return this.get('tablet');
  }

  set tablet(value: Tablet) {
    this.set('tablet', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): TabletUser {
    this.id = parseObject.id;
    this.isActive = parseObject.get('isActive');
    if (parseObject.get('tablet')) {
      const tablet = new Tablet();
      this.tablet = tablet.fromParseObject(parseObject.get('tablet'));
    }
    return this;
  }
}

TabletUser.register();
