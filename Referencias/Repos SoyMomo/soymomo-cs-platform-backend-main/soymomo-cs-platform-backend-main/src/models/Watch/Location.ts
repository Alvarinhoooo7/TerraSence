import type { GeoPoint } from 'parse/node';
import Parse from 'parse/node';

export default class Location extends Parse.Object {
  static className = 'Location';

  get location(): GeoPoint | undefined {
    return this.get('location');
  }

  set location(value: GeoPoint | undefined) {
    this.set('location', value);
  }

  get accuracy(): number {
    return this.get('accuracy');
  }

  set accuracy(value: number) {
    this.set('accuracy', value);
  }

  public static register(): void {
    Parse.Object.registerSubclass(this.className, this);
  }

  fromParseObject(parseObject: Parse.Object): Location {
    this.id = parseObject.id;
    this.location = parseObject.get('location');
    this.accuracy = parseObject.get('accuracy');
    return this;
  }
}

Location.register();
