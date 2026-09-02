import Parse from 'parse/node';

export default class Tablet extends Parse.Object {
  static className = 'Tablet';

  constructor() {
    super('Tablet');
  }

  get hid(): string {
    return this.get('hid');
  }

  set hid(value: string) {
    this.set('hid', value);
  }

  get profileName(): string {
    return this.get('profileName');
  }

  set profileName(value: string) {
    this.set('profileName', value);
  }

  get profilePicture(): string {
    return this.get('profilePicture');
  }

  set profilePicture(value: string) {
    this.set('profilePicture', value);
  }

  get browserAllowed(): boolean {
    return this.get('browserAllowed');
  }

  set browserAllowed(value: boolean) {
    this.set('browserAllowed', value);
  }

  get isNotVerified(): boolean {
    return this.get('isNotVerified');
  }

  set isNotVerified(value: boolean) {
    this.set('isNotVerified', value);
  }

  get smartDetectionEnabled(): boolean {
    return this.get('smartDetectionEnabled');
  }

  set smartDetectionEnabled(value: boolean) {
    this.set('smartDetectionEnabled', value);
  }

  get profanityDetectionEnabled(): boolean {
    return this.get('profanityDetectionEnabled');
  }

  set profanityDetectionEnabled(value: boolean) {
    this.set('profanityDetectionEnabled', value);
  }

  get unsafeSearchDetectionEnabled(): boolean {
    return this.get('unsafeSearchDetectionEnabled');
  }

  set unsafeSearchDetectionEnabled(value: boolean) {
    this.set('unsafeSearchDetectionEnabled', value);
  }

  get remoteBlocked(): boolean {
    return this.get('remoteBlocked');
  }

  set remoteBlocked(value: boolean) {
    this.set('remoteBlocked', value);
  }

  get hardwareModel(): string {
    return this.get('hardwareModel');
  }

  set hardwareModel(value: string) {
    this.set('hardwareModel', value);
  }

  get appVersionCode(): number {
    return this.get('appVersionCode');
  }

  set appVersionCode(value: number) {
    this.set('appVersionCode', value);
  }

  get recoveryEmail(): string {
    return this.get('recoveryEmail');
  }

  set recoveryEmail(value: string) {
    this.set('recoveryEmail', value);
  }

  get moodDetectionEnabled(): boolean {
    return this.get('moodDetectionEnabled');
  }

  set moodDetectionEnabled(value: boolean) {
    this.set('moodDetectionEnabled', value);
  }

  get explicitMusicDetectionEnabled(): boolean {
    return this.get('explicitMusicDetectionEnabled');
  }

  set explicitMusicDetectionEnabled(value: boolean) {
    this.set('explicitMusicDetectionEnabled', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): Tablet {
    this.id = parseObject.id;
    this.hid = parseObject.get('hid');
    this.profileName = parseObject.get('profileName');
    this.profilePicture = parseObject.get('profilePicture');
    this.browserAllowed = parseObject.get('browserAllowed');
    this.isNotVerified = parseObject.get('isNotVerified');
    this.smartDetectionEnabled = parseObject.get('smartDetectionEnabled');
    this.profanityDetectionEnabled = parseObject.get(
      'profanityDetectionEnabled'
    );
    this.unsafeSearchDetectionEnabled = parseObject.get(
      'unsafeSearchDetectionEnabled'
    );
    this.remoteBlocked = parseObject.get('remoteBlocked');
    this.hardwareModel = parseObject.get('hardwareModel');
    this.appVersionCode = parseObject.get('appVersionCode');
    this.recoveryEmail = parseObject.get('recoveryEmail');
    this.moodDetectionEnabled = parseObject.get('moodDetectionEnabled');
    this.explicitMusicDetectionEnabled = parseObject.get(
      'explicitMusicDetectionEnabled'
    );
    return this;
  }
}

Tablet.register();
