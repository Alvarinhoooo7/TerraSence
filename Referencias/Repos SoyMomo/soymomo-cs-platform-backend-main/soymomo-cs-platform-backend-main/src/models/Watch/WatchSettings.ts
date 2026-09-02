import Parse from 'parse/node';

export default class WatchSettings extends Parse.Object {
  static className = 'WatchSettings';

  get amPm(): boolean {
    return this.get('amPm');
  }

  set amPm(value: boolean) {
    this.set('amPm', value);
  }

  get GPSMode(): number {
    return this.get('GPSMode');
  }

  set GPSMode(value: number) {
    this.set('GPSMode', value);
  }

  get language(): string {
    return this.get('language');
  }

  set language(value: string) {
    this.set('language', value);
  }

  get timeZone(): string {
    return this.get('timeZone');
  }

  set timeZone(value: string) {
    this.set('timeZone', value);
  }

  get autoAnswer(): boolean {
    return this.get('autoAnswer');
  }

  set autoAnswer(value: boolean) {
    this.set('autoAnswer', value);
  }

  get soundMode(): number {
    return this.get('soundMode');
  }

  set soundMode(value: number) {
    this.set('soundMode', value);
  }

  get dialpadEnabled(): boolean {
    return this.get('dialpadEnabled');
  }

  set dialpadEnabled(value: boolean) {
    this.set('dialpadEnabled', value);
  }

  get batterySaveEnabled(): boolean {
    return this.get('batterySaveEnabled');
  }

  set batterySaveEnabled(value: boolean) {
    this.set('batterySaveEnabled', value);
  }

  get gpsFrequencySeconds(): number {
    return this.get('gpsFrequencySeconds');
  }

  set gpsFrequencySeconds(value: number) {
    this.set('gpsFrequencySeconds', value);
  }

  public static register() {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): WatchSettings {
    this.id = parseObject.id;
    this.amPm = parseObject.get('amPm');
    this.GPSMode = parseObject.get('GPSMode');
    this.language = parseObject.get('language');
    this.timeZone = parseObject.get('timeZone');
    this.autoAnswer = parseObject.get('autoAnswer');
    this.soundMode = parseObject.get('soundMode');
    this.dialpadEnabled = parseObject.get('dialpadEnabled');
    this.batterySaveEnabled = parseObject.get('batterySaveEnabled');
    this.gpsFrequencySeconds = parseObject.get('gpsFrequencySeconds');
    return this;
  }
}

WatchSettings.register();
