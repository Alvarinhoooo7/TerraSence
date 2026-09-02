import Parse from 'parse/node';

import User from '../../../src/models/Watch/User';
import WatchSettings from '../../../src/models/Watch/WatchSettings';
import Wearer from '../../../src/models/Watch/Wearer';

jest.mock('parse/node', () => {
  const MockedParseObject = function (this: any) {
    const data: { [key: string]: any } = {};
    this.get = jest.fn((field) => data[field]);
    this.set = jest.fn((field, value) => {
      data[field] = value;
    });
  };
  MockedParseObject.registerSubclass = jest.fn();
  return {
    Object: MockedParseObject,
    File: jest.fn(),
    User: jest.fn(),
    GeoPoint: jest.fn(),
  };
});

describe('Wearer', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    const mockWatchSettings = new WatchSettings();
    const mockUser = new User();
    const mockGeoPoint = new Parse.GeoPoint(0, 0);
    const mockFile = new Parse.File('avatar.png', {
      base64: '...base64 data...',
    });
    mockParseObject.id = 'testId';
    mockParseObject.set('firstName', 'John');
    mockParseObject.set('lastName', 'Doe');
    mockParseObject.set('weight', 70);
    mockParseObject.set('phone', '1234567890');
    mockParseObject.set('imei', '123456789012345');
    mockParseObject.set('height', 180);
    mockParseObject.set('birthday', new Date('2000-01-01'));
    mockParseObject.set('steps', 10000);
    mockParseObject.set('deviceManufacturer', 'Manufacturer Name');
    mockParseObject.set('userInCharge', mockUser);
    mockParseObject.set('settings', mockWatchSettings);
    mockParseObject.set('lastKnownLocation', mockGeoPoint);
    mockParseObject.set('lastLocationTime', new Date('2022-12-31'));
    mockParseObject.set('lastAccuracy', 10);
    mockParseObject.set('accuracy', 10);
    mockParseObject.set('batteryPercentage', 80);
    mockParseObject.set('avatarId', 1);
    mockParseObject.set('active', true);
    mockParseObject.set('lastTKQ', new Date('2022-12-31'));
    mockParseObject.set('hearts', 5);
    mockParseObject.set('hasWatchOn', true);
    mockParseObject.set('gpsFrequencySeconds', 300);
    mockParseObject.set('lastGpsDate', new Date('2022-12-31'));
    mockParseObject.set('fromGps', true);
    mockParseObject.set('deviceId', 'device-id');
    mockParseObject.set('oldLocation', ['Location 1', 'Location 2']);
    mockParseObject.set('image', mockFile); // You may need to mock this
    mockParseObject.set('pushy', 'pushy-token');
    mockParseObject.set('updatedLocation', true);
    mockParseObject.set('model', 1);
    mockParseObject.set('firstLinked', new Date('2022-01-01'));
    mockParseObject.set('batterySaveInUse', true);

    const wearer = new Wearer();
    const transformedWearer = wearer.fromParseObject(mockParseObject);

    expect(transformedWearer.id).toEqual('testId');
    expect(transformedWearer.firstName).toEqual('John');
    expect(transformedWearer.lastName).toEqual('Doe');
    expect(transformedWearer.weight).toEqual(70);
    expect(transformedWearer.phone).toEqual('1234567890');
    expect(transformedWearer.imei).toEqual('123456789012345');
    expect(transformedWearer.height).toEqual(180);
    expect(transformedWearer.birthday).toEqual(new Date('2000-01-01'));
    expect(transformedWearer.steps).toEqual(10000);
    expect(transformedWearer.deviceManufacturer).toEqual('Manufacturer Name');
    expect(transformedWearer.userInCharge).toEqual(mockUser); // You may need to mock this
    expect(transformedWearer.settings).toEqual(mockWatchSettings); // You may need to mock this
    expect(transformedWearer.lastKnownLocation).toEqual(mockGeoPoint);
    expect(transformedWearer.lastLocationTime).toEqual(new Date('2022-12-31'));
    expect(transformedWearer.lastAccuracy).toEqual(10);
    expect(transformedWearer.accuracy).toEqual(10);
    expect(transformedWearer.batteryPercentage).toEqual(80);
    expect(transformedWearer.avatarId).toEqual(1);
    expect(transformedWearer.active).toEqual(true);
    expect(transformedWearer.lastTKQ).toEqual(new Date('2022-12-31'));
    expect(transformedWearer.hearts).toEqual(5);
    expect(transformedWearer.hasWatchOn).toEqual(true);
    expect(transformedWearer.lastGpsDate).toEqual(new Date('2022-12-31'));
    expect(transformedWearer.fromGps).toEqual(true);
    expect(transformedWearer.deviceId).toEqual('device-id');
    expect(transformedWearer.oldLocation).toEqual(['Location 1', 'Location 2']);
    expect(transformedWearer.image).toEqual(mockFile); // You may need to mock this
    expect(transformedWearer.pushy).toEqual('pushy-token');
    expect(transformedWearer.updatedLocation).toEqual(true);
    expect(transformedWearer.model).toEqual(1);
    expect(transformedWearer.firstLinked).toEqual(new Date('2022-01-01'));
    expect(transformedWearer.batterySaveInUse).toEqual(true);

    expect(mockParseObject.get).toHaveBeenCalledWith('firstName');
    expect(mockParseObject.get).toHaveBeenCalledWith('lastName');
    expect(mockParseObject.get).toHaveBeenCalledWith('weight');
    expect(mockParseObject.get).toHaveBeenCalledWith('phone');
    expect(mockParseObject.get).toHaveBeenCalledWith('imei');
    expect(mockParseObject.get).toHaveBeenCalledWith('height');
    expect(mockParseObject.get).toHaveBeenCalledWith('birthday');
    expect(mockParseObject.get).toHaveBeenCalledWith('steps');
    expect(mockParseObject.get).toHaveBeenCalledWith('deviceManufacturer');
    expect(mockParseObject.get).toHaveBeenCalledWith('userInCharge');
    expect(mockParseObject.get).toHaveBeenCalledWith('settings');
    expect(mockParseObject.get).toHaveBeenCalledWith('lastKnownLocation');
    expect(mockParseObject.get).toHaveBeenCalledWith('lastLocationTime');
    expect(mockParseObject.get).toHaveBeenCalledWith('lastAccuracy');
    expect(mockParseObject.get).toHaveBeenCalledWith('accuracy');
    expect(mockParseObject.get).toHaveBeenCalledWith('batteryPercentage');
    expect(mockParseObject.get).toHaveBeenCalledWith('avatarId');
    expect(mockParseObject.get).toHaveBeenCalledWith('active');
    expect(mockParseObject.get).toHaveBeenCalledWith('lastTKQ');
    expect(mockParseObject.get).toHaveBeenCalledWith('hearts');
    expect(mockParseObject.get).toHaveBeenCalledWith('hasWatchOn');
    expect(mockParseObject.get).toHaveBeenCalledWith('lastGpsDate');
    expect(mockParseObject.get).toHaveBeenCalledWith('fromGps');
    expect(mockParseObject.get).toHaveBeenCalledWith('deviceId');
    expect(mockParseObject.get).toHaveBeenCalledWith('oldLocation');
    expect(mockParseObject.get).toHaveBeenCalledWith('image');
    expect(mockParseObject.get).toHaveBeenCalledWith('pushy');
    expect(mockParseObject.get).toHaveBeenCalledWith('updatedLocation');
    expect(mockParseObject.get).toHaveBeenCalledWith('model');
    expect(mockParseObject.get).toHaveBeenCalledWith('firstLinked');
    expect(mockParseObject.get).toHaveBeenCalledWith('batterySaveInUse');
    // Add other field get operation checks...
  });
});
