/* eslint-disable @typescript-eslint/naming-convention */
/* istanbul ignore file */
import Parse from 'parse/node';

export default class HistoryBattery_V3 extends Parse.Object {
  static className = 'HistoryBattery_V3';

  constructor() {
    super('HistoryBattery_V3');
  }

  get deviceId(): string {
    return this.get('deviceId');
  }

  set deviceId(value: string) {
    this.set('deviceId', value);
  }

  get battery(): Array<{ createdAt: string; battery: number }> {
    return this.get('battery') || [];
  }

  set battery(value: Array<{ createdAt: string; battery: number }>) {
    this.set('battery', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): HistoryBattery_V3 {
    this.id = parseObject.id;
    this.deviceId = parseObject.get('deviceId');
    this.battery = parseObject.get('battery');
    return this;
  }
}

HistoryBattery_V3.register();
