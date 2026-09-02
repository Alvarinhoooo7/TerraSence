import Parse from 'parse/node';

import Wearer from './Wearer';

export default class WatchStatus extends Parse.Object {
  static className = 'WatchStatus';

  constructor() {
    super('WatchStatus');
  }

  get watch(): Wearer {
    return this.get('watch');
  }

  set watch(value: Wearer) {
    this.set('watch', value);
  }

  get info() {
    return this.get('info');
  }

  set info(value) {
    this.set('info', value);
  }

  get packagesInfo() {
    return this.get('packagesInfo');
  }

  set packagesInfo(value) {
    this.set('packagesInfo', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): WatchStatus {
    this.id = parseObject.id;
    this.info = parseObject.get('info');
    if (parseObject.get('watch')) {
      const wearer = new Wearer();
      this.watch = wearer.fromParseObject(parseObject.get('watch'));
    }
    return this;
  }
}

WatchStatus.register();
