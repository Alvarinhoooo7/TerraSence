/* eslint-disable @typescript-eslint/naming-convention */
/* istanbul ignore file */
import Parse from 'parse/node';

export default class LocationHistory extends Parse.Object {
  static className = 'LocationHistory';

  constructor() {
    super(LocationHistory.className);
  }

  get deviceId(): string {
    return this.get('deviceId');
  }

  set deviceId(value: string) {
    this.set('deviceId', value);
  }

  get battery(): number {
    return this.get('battery');
  }

  set battery(value: number) {
    this.set('battery', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): LocationHistory {
    this.id = parseObject.id;
    this.deviceId = parseObject.get('deviceId');
    this.battery = parseObject.get('battery');
    return this;
  }
}

LocationHistory.register();
