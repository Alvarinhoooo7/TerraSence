import Parse from 'parse/node';

import type {
  ApioCredentials,
  StripeCredentials,
} from '@/interfaces/SubscriptionIfcs';

import Tablet from './Tablet';
import TabletSim from './TabletSim';

interface Plan extends Parse.Object {
  createdAt: Date;
}

export default class TabletSubscription extends Parse.Object {
  static className = 'Subscription';

  constructor() {
    super('Subscription');
  }

  get iccId(): string {
    return this.get('iccId');
  }

  set iccId(value: string) {
    this.set('iccId', value);
  }

  get msisdn(): string {
    return this.get('msisdn');
  }

  set msisdn(value: string) {
    this.set('msisdn', value);
  }

  get status(): string {
    return this.get('status');
  }

  set status(value: string) {
    this.set('status', value);
  }

  get plan(): Plan {
    return this.get('plan');
  }

  set plan(value: Plan) {
    this.set('plan', value);
  }

  get sim(): TabletSim {
    return this.get('sim');
  }

  set sim(value: TabletSim) {
    this.set('sim', value);
  }

  get tablet(): Tablet {
    return this.get('tablet');
  }

  set tablet(value: Tablet) {
    this.set('tablet', value);
  }

  get subscriber(): Object {
    return this.get('subscriber');
  }

  set subscriber(value: Object) {
    this.set('subscriber', value);
  }

  get gigsSubscriptionId(): string {
    return this.get('gigsSubscriptionId');
  }

  set gigsSubscriptionId(value: string) {
    this.set('gigsSubscriptionId', value);
  }

  get alaiSubscriptionId(): string {
    return this.get('alaiSubscriptionId');
  }

  set alaiSubscriptionId(value: string) {
    this.set('alaiSubscriptionId', value);
  }

  get isActive(): boolean {
    return this.get('isActive');
  }

  set isActive(value: boolean) {
    this.set('isActive', value);
  }

  get startDate(): Date {
    return this.get('startDate');
  }

  set startDate(value: Date) {
    this.set('startDate', value);
  }

  get cancellationExplanation(): string {
    return this.get('cancellationExplanation');
  }

  set cancellationExplanation(value: string) {
    this.set('cancellationExplanation', value);
  }

  get stripeCredentials(): StripeCredentials {
    return this.get('stripeCredentials');
  }

  set stripeCredentials(value: StripeCredentials) {
    this.set('stripeCredentials', value);
  }

  get apioCredentials(): ApioCredentials {
    return this.get('apioCredentials');
  }

  set apioCredentials(value: ApioCredentials) {
    this.set('apioCredentials', value);
  }

  get imei(): string {
    return this.get('imei');
  }

  set imei(value: string) {
    this.set('imei', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): TabletSubscription {
    this.id = parseObject.id;
    this.iccId = parseObject.get('iccId');
    this.msisdn = parseObject.get('msisdn');
    this.status = parseObject.get('status');
    this.plan = parseObject.get('plan');
    this.gigsSubscriptionId = parseObject.get('gigsSubscriptionId');
    this.alaiSubscriptionId = parseObject.get('alaiSubscriptionId');
    this.subscriber = parseObject.get('subscriber');
    this.imei = parseObject.get('imei');
    this.isActive = parseObject.get('isActive');
    this.startDate = parseObject.get('startDate');
    if (parseObject.get('sim')) {
      const sim = new TabletSim();
      this.sim = sim.fromParseObject(parseObject.get('sim'));
    }
    if (parseObject.get('tablet')) {
      const tablet = new Tablet();
      this.tablet = tablet.fromParseObject(parseObject.get('tablet'));
    }
    this.cancellationExplanation = parseObject.get('cancellationExplanation');
    this.stripeCredentials = parseObject.get('stripeCredentials');
    this.apioCredentials = parseObject.get('apioCredentials');
    return this;
  }
}
