import type { File, GeoPoint } from 'parse/node';
import Parse from 'parse/node';

import type User from './User';
import WatchSettings from './WatchSettings';

export default class Wearer extends Parse.Object {
  static className = 'Wearer';

  constructor() {
    super('Wearer');
  }

  get deviceId(): string {
    return this.get('deviceId');
  }

  set deviceId(value: string) {
    this.set('deviceId', value);
  }

  get firstName(): string {
    return this.get('firstName');
  }

  set firstName(value: string) {
    this.set('firstName', value);
  }

  get lastName(): string {
    return this.get('lastName');
  }

  set lastName(value: string) {
    this.set('lastName', value);
  }

  get phone(): string {
    return this.get('phone');
  }

  set phone(value: string) {
    this.set('phone', value);
  }

  get imei(): string {
    return this.get('imei');
  }

  set imei(value: string) {
    this.set('imei', value);
  }

  get weight(): number {
    return this.get('weight');
  }

  set weight(value: number) {
    this.set('weight', value);
  }

  get height(): number {
    return this.get('height');
  }

  set height(value: number) {
    this.set('height', value);
  }

  get birthday(): Date | null {
    return this.get('birthday');
  }

  set birthday(value: Date | null) {
    this.set('birthday', value);
  }

  get steps(): number {
    return this.get('steps');
  }

  set steps(value: number) {
    this.set('steps', value);
  }

  get deviceManufacturer(): string {
    return this.get('deviceManufacturer');
  }

  set deviceManufacturer(value: string) {
    this.set('deviceManufacturer', value);
  }

  get userInCharge(): User {
    return this.get('userInCharge');
  }

  set userInCharge(value: User) {
    this.set('userInCharge', value);
  }

  get settings(): WatchSettings {
    return this.get('settings');
  }

  set settings(value: WatchSettings) {
    this.set('settings', value);
  }

  get lastKnownLocation(): GeoPoint {
    return this.get('lastKnownLocation');
  }

  set lastKnownLocation(value: GeoPoint) {
    this.set('lastKnownLocation', value);
  }

  get lastLocationTime(): Date {
    return this.get('lastLocationTime');
  }

  set lastLocationTime(value: Date) {
    this.set('lastLocationTime', value);
  }

  get lastAccuracy(): number {
    return this.get('lastAccuracy');
  }

  set lastAccuracy(value: number) {
    this.set('lastAccuracy', value);
  }

  get accuracy(): number {
    return this.get('accuracy');
  }

  set accuracy(value: number) {
    this.set('accuracy', value);
  }

  get batteryPercentage(): number {
    return this.get('batteryPercentage');
  }

  set batteryPercentage(value: number) {
    this.set('batteryPercentage', value);
  }

  get avatarId(): number {
    return this.get('avatarId');
  }

  set avatarId(value: number) {
    this.set('avatarId', value);
  }

  get active(): boolean {
    return this.get('active');
  }

  set active(value: boolean) {
    this.set('active', value);
  }

  get lastTKQ(): Date | null {
    return this.get('lastTKQ');
  }

  set lastTKQ(value: Date | null) {
    this.set('lastTKQ', value);
  }

  get hearts(): number {
    return this.get('hearts');
  }

  set hearts(value: number) {
    this.set('hearts', value);
  }

  get hasWatchOn(): boolean {
    return this.get('hasWatchOn');
  }

  set hasWatchOn(value: boolean) {
    this.set('hasWatchOn', value);
  }

  get GPSMode(): number {
    return this.get('GPSMode');
  }

  set GPSMode(value: number) {
    this.set('GPSMode', value);
  }

  get lastGpsDate(): Date {
    return this.get('lastGpsDate');
  }

  set lastGpsDate(value: Date) {
    this.set('lastGpsDate', value);
  }

  get updatedAt(): Date {
    return this.get('updatedAt');
  }

  set updatedAt(value: Date) {
    this.set('updatedAt', value);
  }

  get fromGps(): boolean {
    return this.get('fromGps');
  }

  set fromGps(value: boolean) {
    this.set('fromGps', value);
  }

  get oldLocation(): string[] {
    return this.get('oldLocation');
  }

  set oldLocation(value: string[]) {
    this.set('oldLocation', value);
  }

  get image(): File | null {
    return this.get('image');
  }

  set image(value: File | null) {
    this.set('image', value);
  }

  get pushy(): string | null {
    return this.get('pushy');
  }

  set pushy(value: string | null) {
    this.set('pushy', value);
  }

  get updatedLocation(): boolean {
    return this.get('updatedLocation');
  }

  set updatedLocation(value: boolean) {
    this.set('updatedLocation', value);
  }

  get model(): number {
    return this.get('model');
  }

  set model(value: number) {
    this.set('model', value);
  }

  get firstLinked(): Date {
    return this.get('firstLinked');
  }

  set firstLinked(value: Date) {
    this.set('firstLinked', value);
  }

  get batterySaveInUse(): boolean {
    return this.get('batterySaveInUse');
  }

  set batterySaveInUse(value: boolean) {
    this.set('batterySaveInUse', value);
  }

  get hardwareModel(): String {
    return this.get('hardwareModel');
  }

  set hardwareModel(value: String) {
    this.set('hardwareModel', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): Wearer {
    this.id = parseObject.id;
    this.firstName = parseObject.get('firstName');
    this.lastName = parseObject.get('lastName');
    this.weight = parseObject.get('weight');
    this.height = parseObject.get('height');
    this.birthday = parseObject.get('birthday');
    this.steps = parseObject.get('steps');
    this.deviceManufacturer = parseObject.get('deviceManufacturer');
    this.userInCharge = parseObject.get('userInCharge');
    if (parseObject.get('settings')) {
      this.settings = Object.assign(
        new WatchSettings().fromParseObject(parseObject.get('settings')),
        parseObject.get('settings')
      );
    }
    this.lastKnownLocation = parseObject.get('lastKnownLocation');
    this.lastLocationTime = parseObject.get('lastLocationTime');
    this.lastAccuracy = parseObject.get('lastAccuracy');
    this.accuracy = parseObject.get('accuracy');
    this.batteryPercentage = parseObject.get('batteryPercentage');
    this.avatarId = parseObject.get('avatarId');
    this.active = parseObject.get('active');
    this.lastTKQ = parseObject.get('lastTKQ');
    this.updatedAt = parseObject.get('updatedAt');
    this.hearts = parseObject.get('hearts');
    this.hasWatchOn = parseObject.get('hasWatchOn');
    this.lastGpsDate = parseObject.get('lastGpsDate');
    this.fromGps = parseObject.get('fromGps');
    this.phone = parseObject.get('phone');
    this.deviceId = parseObject.get('deviceId');
    this.imei = parseObject.get('imei');
    this.oldLocation = parseObject.get('oldLocation');
    this.image = parseObject.get('image');
    this.pushy = parseObject.get('pushy');
    this.updatedLocation = parseObject.get('updatedLocation');
    this.model = parseObject.get('model');
    this.firstLinked = parseObject.get('firstLinked');
    this.batterySaveInUse = parseObject.get('batterySaveInUse');
    this.hardwareModel = parseObject.get('hardwareModel');
    return this;
  }
}

Wearer.register();
