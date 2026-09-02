import Parse from 'parse/node';

import type {
  ApioCredentials,
  Plan,
  StripeCredentials,
} from '@/interfaces/SubscriptionIfcs';

import type Sim from './Sim';
import type SubscriptionsUserInfo from './SubscriptionUser';
import Wearer from './Wearer';

export default class Subscription extends Parse.Object {
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

  get subscriber(): SubscriptionsUserInfo {
    return this.get('subscriber');
  }

  set subscriber(value: SubscriptionsUserInfo) {
    this.set('subscriber', value);
  }

  get imei(): string {
    return this.get('imei');
  }

  set imei(value: string) {
    this.set('imei', value);
  }

  get plan(): Plan {
    return this.get('plan');
  }

  set plan(value: Plan) {
    this.set('plan', value);
  }

  get watch(): Wearer {
    return this.get('watch');
  }

  set watch(value: Wearer) {
    this.set('watch', value);
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

  get status(): string {
    return this.get('status');
  }

  set status(value: string) {
    this.set('status', value);
  }

  get sim(): Sim {
    return this.get('sim');
  }

  set sim(value: Sim) {
    this.set('sim', value);
  }

  get msisdn(): string {
    return this.get('msisdn');
  }

  set msisdn(value: string) {
    this.set('msisdn', value);
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

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): Subscription {
    this.iccId = parseObject.get('iccId');
    this.gigsSubscriptionId = parseObject.get('gigsSubscriptionId');
    this.alaiSubscriptionId = parseObject.get('alaiSubscriptionId');
    this.subscriber = parseObject.get('subscriber');
    this.imei = parseObject.get('imei');
    this.plan = parseObject.get('plan');
    this.watch = parseObject.get('watch');
    if (parseObject.get('watch')) {
      this.watch = Object.assign(
        new Wearer().fromParseObject(parseObject.get('watch')),
        parseObject.get('watch')
      );
    }
    this.isActive = parseObject.get('isActive');
    this.startDate = parseObject.get('startDate');
    this.status = parseObject.get('status');
    this.sim = parseObject.get('sim');
    this.msisdn = parseObject.get('msisdn');
    this.stripeCredentials = parseObject.get('stripeCredentials');
    this.apioCredentials = parseObject.get('apioCredentials');
    return this;
  }
}

Subscription.register();
