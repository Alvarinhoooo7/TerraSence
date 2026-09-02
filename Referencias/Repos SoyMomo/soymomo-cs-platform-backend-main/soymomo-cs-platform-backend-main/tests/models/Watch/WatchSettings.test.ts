import Parse from 'parse/node';

import WatchSettings from '../../../src/models/Watch/WatchSettings';

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

describe('WatchSettings', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    mockParseObject.id = 'testId';
    mockParseObject.set('amPm', true);
    mockParseObject.set('gpsFrequencySeconds', 300);
    mockParseObject.set('language', '4');
    mockParseObject.set('timeZone', '-1');
    mockParseObject.set('soundMode', 1);
    mockParseObject.set('dialpadEnabled', true);
    mockParseObject.set('batterySaveEnabled', true);
    mockParseObject.set('gpsFrequencySeconds', 600);

    const watchSettings = new WatchSettings();
    const transformedWatchSettings =
      watchSettings.fromParseObject(mockParseObject);

    expect(transformedWatchSettings.id).toEqual('testId');
    expect(transformedWatchSettings.amPm).toEqual(true);
    expect(transformedWatchSettings.gpsFrequencySeconds).toEqual(300);
    expect(transformedWatchSettings.language).toEqual('4');
    expect(transformedWatchSettings.timeZone).toEqual('-1');
    expect(transformedWatchSettings.soundMode).toEqual(1);
    expect(transformedWatchSettings.dialpadEnabled).toEqual(true);
    expect(transformedWatchSettings.batterySaveEnabled).toEqual(true);
    expect(transformedWatchSettings.gpsFrequencySeconds).toEqual(600);
    expect(mockParseObject.get).toHaveBeenCalledWith('amPm');
    expect(mockParseObject.get).toHaveBeenCalledWith('gpsFrequencySeconds');
    expect(mockParseObject.get).toHaveBeenCalledWith('language');
    expect(mockParseObject.get).toHaveBeenCalledWith('timeZone');
    expect(mockParseObject.get).toHaveBeenCalledWith('soundMode');
    expect(mockParseObject.get).toHaveBeenCalledWith('dialpadEnabled');
    expect(mockParseObject.get).toHaveBeenCalledWith('batterySaveEnabled');
    expect(mockParseObject.get).toHaveBeenCalledWith('gpsFrequencySeconds');
  });
});
