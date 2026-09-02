import Parse from 'parse/node';

export default class StoreInfo extends Parse.Object {
  static className = 'StoreInfo';

  constructor() {
    super('StoreInfo');
  }

  get name(): string {
    return this.get('name');
  }

  set name(value: string) {
    this.set('name', value);
  }

  get packageName(): string {
    return this.get('packageName');
  }

  set packageName(value: string) {
    this.set('packageName', value);
  }

  get locale(): string {
    return this.get('locale');
  }

  set locale(value: string) {
    this.set('locale', value);
  }

  get image(): string {
    return this.get('image');
  }

  set image(value: string) {
    this.set('image', value);
  }

  get description(): string {
    return this.get('description');
  }

  set description(value: string) {
    this.set('description', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): StoreInfo {
    this.id = parseObject.id;
    this.name = parseObject.get('name');
    this.packageName = parseObject.get('packageName');
    this.locale = parseObject.get('locale');
    this.image = parseObject.get('image');
    this.description = parseObject.get('description');
    return this;
  }
}

StoreInfo.register();
