import Parse from 'parse/node';

import type { MnoProvider } from '@/interfaces/SubscriptionIfcs';

import Wearer from './Wearer';

export default class Sim extends Parse.Object {
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

  get watch(): Wearer {
    return this.get('watch');
  }

  set watch(value: Wearer) {
    this.set('watch', value);
  }

  get networkOperator(): Object {
    return this.get('networkOperator');
  }

  set networkOperator(value: Object) {
    this.set('networkOperator', value);
  }

  get pinNumber(): string {
    return this.get('pin');
  }

  set pinNumber(value: string) {
    this.set('pin', value);
  }

  get isPreInsertedInWatch(): boolean {
    return this.get('isPreInsertedInWatch');
  }

  set isPreInsertedInWatch(value: boolean) {
    this.set('isPreInsertedInWatch', value);
  }

  get gigsDeviceId(): string {
    return this.get('gigsDeviceId');
  }

  set gigsDeviceId(value: string) {
    this.set('gigsDeviceId', value);
  }

  get mnoProvider(): MnoProvider {
    return this.get('mnoProvider');
  }

  set mnoProvider(value: MnoProvider) {
    this.set('mnoProvider', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): Sim {
    this.iccId = parseObject.get('iccId');
    this.puk = parseObject.get('puk');
    this.pinNumber = parseObject.get('pin');
    this.isPreInsertedInWatch = parseObject.get('isPreInsertedInWatch');
    this.gigsDeviceId = parseObject.get('gigsDeviceId');
    this.mnoProvider = parseObject.get('mnoProvider');
    this.networkOperator = parseObject.get('networkOperator');
    this.watch = parseObject.get('watch');
    if (parseObject.get('watch')) {
      this.watch = Object.assign(
        new Wearer().fromParseObject(parseObject.get('watch')),
        parseObject.get('watch')
      );
    }
    return this;
  }
}

Sim.register();
