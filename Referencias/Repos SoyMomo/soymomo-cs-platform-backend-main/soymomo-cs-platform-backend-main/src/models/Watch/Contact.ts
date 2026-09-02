import type { File } from 'parse/node';
import Parse from 'parse/node';

export default class Contact extends Parse.Object {
  static className = 'Contact';

  constructor() {
    super('Contact');
  }

  get chatEnabled(): boolean {
    return this.get('chatEnabled');
  }

  set chatEnabled(value: boolean) {
    this.set('chatEnabled', value);
  }

  get position(): number {
    return this.get('position');
  }

  set position(value: number) {
    this.set('position', value);
  }

  get name(): string {
    return this.get('name');
  }

  set name(value: string) {
    this.set('name', value);
  }

  get phone(): string {
    return this.get('phone');
  }

  set phone(value: string) {
    this.set('phone', value);
  }

  get sos(): boolean {
    return this.get('sos');
  }

  set sos(value: boolean) {
    this.set('sos', value);
  }

  get picture(): File {
    return this.get('picture');
  }

  set picture(value: File) {
    this.set('picture', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): Contact {
    this.id = parseObject.id;
    this.chatEnabled = parseObject.get('chatEnabled');
    this.position = parseObject.get('position');
    this.name = parseObject.get('name');
    this.phone = parseObject.get('phone');
    this.sos = parseObject.get('sos');
    this.picture = parseObject.get('picture');
    return this;
  }
}

Contact.register();
