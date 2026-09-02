import Parse from 'parse/node';

export default class UserPermission extends Parse.Object {
  static className = 'UserPermission';

  constructor() {
    super('UserPermission');
  }

  get edit(): boolean {
    return this.get('edit');
  }

  set edit(value: boolean) {
    this.set('edit', value);
  }

  get messages(): boolean {
    return this.get('messages');
  }

  set messages(value: boolean) {
    this.set('messages', value);
  }

  get location(): boolean {
    return this.get('location');
  }

  set location(value: boolean) {
    this.set('location', value);
  }

  get videocall(): boolean {
    return this.get('videocall');
  }

  set videocall(value: boolean) {
    this.set('videocall', value);
  }

  get call(): boolean {
    return this.get('call');
  }

  set call(value: boolean) {
    this.set('call', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): UserPermission {
    this.id = parseObject.id;
    this.edit = parseObject.get('edit');
    this.messages = parseObject.get('messages');
    this.location = parseObject.get('location');
    this.videocall = parseObject.get('videocall');
    this.call = parseObject.get('call');
    return this;
  }
}

UserPermission.register();
