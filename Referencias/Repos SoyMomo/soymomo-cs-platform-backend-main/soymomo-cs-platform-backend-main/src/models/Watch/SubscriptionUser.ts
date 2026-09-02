import Parse from 'parse/node';

import type User from './User'; // Adjust the import path as necessary

export default class SubscriptionsUserInfo extends Parse.Object {
  static className = 'SubscriptionsUserInfo';

  constructor() {
    super('SubscriptionsUserInfo');
  }

  get lastname(): string {
    return this.get('lastname');
  }

  set lastname(value: string) {
    this.set('lastname', value);
  }

  get ACL(): string {
    return this.get('ACL');
  }

  set ACL(value: string) {
    this.set('ACL', value);
  }

  get city(): string {
    return this.get('city');
  }

  set city(value: string) {
    this.set('city', value);
  }

  get name(): string {
    return this.get('name');
  }

  set name(value: string) {
    this.set('name', value);
  }

  get user(): User {
    return this.get('user');
  }

  set user(value: User) {
    this.set('user', value);
  }

  get phone(): string {
    return this.get('phone');
  }

  set phone(value: string) {
    this.set('phone', value);
  }

  get updatedAt(): Date {
    return this.get('updatedAt');
  }

  set updatedAt(value: Date) {
    this.set('updatedAt', value);
  }

  get state(): string {
    return this.get('state');
  }

  set state(value: string) {
    this.set('state', value);
  }

  get gigsUserId(): string {
    return this.get('gigsUserId');
  }

  set gigsUserId(value: string) {
    this.set('gigsUserId', value);
  }

  get address(): string {
    return this.get('address');
  }

  set address(value: string) {
    this.set('address', value);
  }

  get alaiSubscriberId(): string | undefined {
    return this.get('alaiSubscriberId');
  }

  set alaiSubscriberId(value: string | undefined) {
    this.set('alaiSubscriberId', value);
  }

  get gigsSubscriberId(): string | undefined {
    return this.get('gigsSubscriberId');
  }

  set gigsSubscriberId(value: string | undefined) {
    this.set('gigsSubscriberId', value);
  }

  get country(): string {
    return this.get('country');
  }

  set country(value: string) {
    this.set('country', value);
  }

  get postalCode(): string {
    return this.get('postalCode');
  }

  set postalCode(value: string) {
    this.set('postalCode', value);
  }

  get createdAt(): Date {
    return this.get('createdAt');
  }

  set createdAt(value: Date) {
    this.set('createdAt', value);
  }

  get personalId(): string {
    return this.get('personalId');
  }

  set personalId(value: string) {
    this.set('personalId', value);
  }

  get email(): string {
    return this.get('email');
  }

  set email(value: string) {
    this.set('email', value);
  }

  get birthday(): string {
    return this.get('birthday');
  }

  set birthday(value: string) {
    this.set('birthday', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  // If you have methods to convert to/from Parse objects, you can add them here
  fromParseObject(parseObject: Parse.Object): SubscriptionsUserInfo {
    this.lastname = parseObject.get('lastname');
    this.ACL = parseObject.get('ACL');
    this.city = parseObject.get('city');
    this.name = parseObject.get('name');
    this.user = parseObject.get('user');
    this.phone = parseObject.get('phone');
    this.updatedAt = parseObject.get('updatedAt');
    this.state = parseObject.get('state');
    this.gigsUserId = parseObject.get('gigsUserId');
    this.address = parseObject.get('address');
    this.alaiSubscriberId = parseObject.get('alaiSubscriberId');
    this.gigsSubscriberId = parseObject.get('gigsSubscriberId');
    this.country = parseObject.get('country');
    this.postalCode = parseObject.get('postalCode');
    this.createdAt = parseObject.get('createdAt');
    this.personalId = parseObject.get('personalId');
    this.email = parseObject.get('email');
    this.birthday = parseObject.get('birthday');
    return this;
  }
}

// Don't forget to register the subclass if you're using it with Parse
SubscriptionsUserInfo.register();
