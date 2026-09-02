import type { File } from 'parse/node';
import Parse from 'parse/node';

import Tablet from './Tablet';

export default class SmartDetection extends Parse.Object {
  static className = 'SmartDetection';

  constructor() {
    super('SmartDetection');
  }

  get isCorrect(): boolean {
    return this.get('isCorrect');
  }

  set isCorrect(value: boolean) {
    this.set('isCorrect', value);
  }

  get screenshot(): File {
    return this.get('screenshot');
  }

  set screenshot(value: File) {
    this.set('screenshot', value);
  }

  get tablet(): Tablet {
    return this.get('tablet');
  }

  set tablet(value: Tablet) {
    this.set('tablet', value);
  }

  get confidence(): number {
    return this.get('confidence');
  }

  set confidence(value: number) {
    this.set('confidence', value);
  }

  get modelSize(): string {
    return this.get('modelSize');
  }

  set modelSize(value: string) {
    this.set('modelSize', value);
  }

  get appName(): string {
    return this.get('appName');
  }

  set appName(value: string) {
    this.set('appName', value);
  }

  get packageName(): string {
    return this.get('packageName');
  }

  set packageName(value: string) {
    this.set('packageName', value);
  }

  get classType(): string {
    return this.get('classType');
  }

  set classType(value: string) {
    this.set('classType', value);
  }

  get modelVersionName(): string {
    return this.get('modelVersionName');
  }

  set modelVersionName(value: string) {
    this.set('modelVersionName', value);
  }

  get coordinates(): string {
    return this.get('coordinates');
  }

  set coordinates(value: string) {
    this.set('coordinates', value);
  }

  get tabletVersionName(): string {
    return this.get('tabletVersionName');
  }

  set tabletVersionName(value: string) {
    this.set('tabletVersionName', value);
  }

  get category(): number {
    return this.get('category');
  }

  set category(value: number) {
    this.set('category', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): SmartDetection {
    this.id = parseObject.id;
    this.isCorrect = parseObject.get('isCorrect');
    this.screenshot = parseObject.get('screenshot');
    if (parseObject.get('tablet')) {
      const tablet = new Tablet();
      this.tablet = tablet.fromParseObject(parseObject.get('tablet'));
    }
    this.confidence = parseObject.get('confidence');
    this.modelSize = parseObject.get('modelSize');
    this.appName = parseObject.get('appName');
    this.packageName = parseObject.get('packageName');
    this.classType = parseObject.get('classType');
    this.modelVersionName = parseObject.get('modelVersionName');
    this.coordinates = parseObject.get('coordinates');
    this.tabletVersionName = parseObject.get('tabletVersionName');
    this.category = parseObject.get('category');
    return this;
  }
}

SmartDetection.register();
