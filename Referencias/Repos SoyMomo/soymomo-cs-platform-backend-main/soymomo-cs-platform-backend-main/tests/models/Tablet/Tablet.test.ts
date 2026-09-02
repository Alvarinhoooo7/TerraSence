import Parse from 'parse/node';

import Tablet from '../../../src/models/Tablet/Tablet';

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
  };
});

describe('Tablet', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    mockParseObject.id = 'testId';
    mockParseObject.set('hid', 'testHid');
    mockParseObject.set('profileName', 'testProfileName');
    mockParseObject.set('profilePicture', 'testProfilePicture');
    mockParseObject.set('browserAllowed', true);
    mockParseObject.set('isNotVerified', false);
    mockParseObject.set('smartDetectionEnabled', true);
    mockParseObject.set('profanityDetectionEnabled', true);
    mockParseObject.set('unsafeSearchDetectionEnabled', false);
    mockParseObject.set('remoteBlocked', false);
    mockParseObject.set('hardwareModel', 'testHardwareModel');
    mockParseObject.set('appVersionCode', 1);
    mockParseObject.set('recoveryEmail', 'test@recovery.com');
    mockParseObject.set('moodDetectionEnabled', true);
    mockParseObject.set('explicitMusicDetectionEnabled', false);

    const tablet = new Tablet();
    const transformedTablet = tablet.fromParseObject(mockParseObject);

    expect(transformedTablet.id).toEqual('testId');
    expect(transformedTablet.hid).toEqual('testHid');
    expect(transformedTablet.profileName).toEqual('testProfileName');
    expect(transformedTablet.profilePicture).toEqual('testProfilePicture');
    expect(transformedTablet.browserAllowed).toEqual(true);
    expect(transformedTablet.isNotVerified).toEqual(false);
    expect(transformedTablet.smartDetectionEnabled).toEqual(true);
    expect(transformedTablet.profanityDetectionEnabled).toEqual(true);
    expect(transformedTablet.unsafeSearchDetectionEnabled).toEqual(false);
    expect(transformedTablet.remoteBlocked).toEqual(false);
    expect(transformedTablet.hardwareModel).toEqual('testHardwareModel');
    expect(transformedTablet.appVersionCode).toEqual(1);
    expect(transformedTablet.recoveryEmail).toEqual('test@recovery.com');
    expect(transformedTablet.moodDetectionEnabled).toEqual(true);
    expect(transformedTablet.explicitMusicDetectionEnabled).toEqual(false);
    expect(mockParseObject.get).toHaveBeenCalledWith('hid');
    expect(mockParseObject.get).toHaveBeenCalledWith('profileName');
    expect(mockParseObject.get).toHaveBeenCalledWith('profilePicture');
    expect(mockParseObject.get).toHaveBeenCalledWith('browserAllowed');
    expect(mockParseObject.get).toHaveBeenCalledWith('isNotVerified');
    expect(mockParseObject.get).toHaveBeenCalledWith('smartDetectionEnabled');
    expect(mockParseObject.get).toHaveBeenCalledWith(
      'profanityDetectionEnabled'
    );
    expect(mockParseObject.get).toHaveBeenCalledWith(
      'unsafeSearchDetectionEnabled'
    );
    expect(mockParseObject.get).toHaveBeenCalledWith('remoteBlocked');
    expect(mockParseObject.get).toHaveBeenCalledWith('hardwareModel');
    expect(mockParseObject.get).toHaveBeenCalledWith('appVersionCode');
    expect(mockParseObject.get).toHaveBeenCalledWith('recoveryEmail');
    expect(mockParseObject.get).toHaveBeenCalledWith('moodDetectionEnabled');
    expect(mockParseObject.get).toHaveBeenCalledWith(
      'explicitMusicDetectionEnabled'
    );
  });
});
