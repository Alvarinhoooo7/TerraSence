import Parse from 'parse/node';

import Tablet from './Tablet';

export default class BatteryInfo extends Parse.Object {
  static className = 'BatteryInfo';

  constructor() {
    super('BatteryInfo');
  }

  get tablet(): Tablet {
    return this.get('tablet');
  }

  set tablet(value: Tablet) {
    this.set('tablet', value);
  }

  get percentage(): number {
    return this.get('percentage');
  }

  set percentage(value: number) {
    this.set('percentage', value);
  }

  get chargingMethod(): string {
    return this.get('chargingMethod');
  }

  set chargingMethod(value: string) {
    this.set('chargingMethod', value);
  }

  get health(): string {
    return this.get('health');
  }

  set health(value: string) {
    this.set('health', value);
  }

  get createdAtOnTablet(): Date {
    return this.get('createdAtOnTablet');
  }

  set createdAtOnTablet(value: Date) {
    this.set('createdAtOnTablet', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): BatteryInfo {
    this.id = parseObject.id;
    if (parseObject.get('tablet')) {
      const tablet = new Tablet();
      this.tablet = tablet.fromParseObject(parseObject.get('tablet'));
    }
    this.percentage = parseObject.get('percentage');
    this.chargingMethod = parseObject.get('chargingMethod');
    this.health = parseObject.get('health');
    this.createdAtOnTablet = parseObject.get('createdAtOnTablet');
    return this;
  }
}

BatteryInfo.register();
