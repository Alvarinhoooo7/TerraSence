import type { File } from 'parse/node';
import Parse from 'parse/node';

export default class User extends Parse.User {
  static className = '_User';

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

  get email(): string {
    return this.get('email');
  }

  set email(value: string) {
    this.set('email', value);
  }

  get phone(): string {
    return this.get('phone');
  }

  set phone(value: string) {
    this.set('phone', value);
  }

  get acceptedNewToS(): boolean {
    return this.get('acceptedNewToS');
  }

  set acceptedNewToS(value: boolean) {
    this.set('acceptedNewToS', value);
  }

  get fb(): boolean {
    return this.get('fb');
  }

  set fb(value: boolean) {
    this.set('fb', value);
  }

  get image(): File {
    return this.get('image');
  }

  set image(value: File) {
    this.set('image', value);
  }

  get hasRequestedDeletion(): boolean {
    return this.get('hasRequestedDeletion');
  }

  set hasRequestedDeletion(value: boolean) {
    this.set('hasRequestedDeletion', value);
  }

  get birthday(): Date {
    return this.get('birthday');
  }

  set birthday(value: Date) {
    this.set('birthday', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): User {
    this.id = parseObject.id;
    this.firstName = parseObject.get('firstName');
    this.lastName = parseObject.get('lastName');
    this.phone = parseObject.get('phone');
    this.acceptedNewToS = parseObject.get('acceptedNewToS');
    this.fb = parseObject.get('fb');
    this.image = parseObject.get('image');
    this.hasRequestedDeletion = parseObject.get('hasRequestedDeletion');
    this.birthday = parseObject.get('birthday');
    this.email = parseObject.get('email');
    return this;
  }
}

User.register();
