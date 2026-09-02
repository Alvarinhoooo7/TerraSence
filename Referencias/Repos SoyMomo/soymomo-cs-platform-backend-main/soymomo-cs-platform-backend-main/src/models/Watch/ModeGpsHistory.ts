import Parse from 'parse';

export default class ModeGpsHistory extends Parse.Object {
  static className = 'ModeGpsHistory';

  get GPSMode(): number {
    return this.get('GPSMode');
  }

  set GPSMode(value: number) {
    this.set('GPSMode', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): ModeGpsHistory {
    this.id = parseObject.id;
    this.GPSMode = parseObject.get('GPSMode');
    return this;
  }
}

ModeGpsHistory.register();
