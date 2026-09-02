import Parse from 'parse/node';

export default class TabletSim extends Parse.Object {
  static className = 'Sim';

  constructor() {
    super('Sim');
  }

  get iccId(): string {
    return this.get('iccId');
  }

  set iccId(value: string) {
    this.set('iccId', value);
  }

  get puk(): string {
    return this.get('puk');
  }

  set puk(value: string) {
    this.set('puk', value);
  }

  get pinNumber(): string {
    return this.get('pin');
  }

  set pinNumber(value: string) {
    this.set('pin', value);
  }

  get mnoProvider(): Object {
    return this.get('mnoProvider');
  }

  set mnoProvider(value: Object) {
    this.set('mnoProvider', value);
  }

  get networkOperator(): Object {
    return this.get('networkOperator');
  }

  set networkOperator(value: Object) {
    this.set('networkOperator', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): TabletSim {
    this.id = parseObject.id;
    this.iccId = parseObject.get('iccId');
    this.puk = parseObject.get('puk');
    this.pinNumber = parseObject.get('pin');
    this.mnoProvider = parseObject.get('mnoProvider');
    this.networkOperator = parseObject.get('networkOperator');
    return this;
  }
}
