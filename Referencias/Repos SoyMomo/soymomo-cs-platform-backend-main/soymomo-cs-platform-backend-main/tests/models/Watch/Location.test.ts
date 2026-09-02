import Parse from 'parse/node';

import Location from '../../../src/models/Watch/Location';

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

describe('Location', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    mockParseObject.set('location', {
      latitude: 40.758896,
      longitude: -73.98513,
    });
    mockParseObject.set('accuracy', 100);
    mockParseObject.id = 'testId';

    const testLocation = new Location();
    const transformedLocation = testLocation.fromParseObject(mockParseObject);

    expect(transformedLocation.id).toEqual('testId');
    expect(transformedLocation.location).toEqual({
      latitude: 40.758896,
      longitude: -73.98513,
    });
    expect(transformedLocation.accuracy).toEqual(100);
    expect(mockParseObject.get).toHaveBeenCalledWith('location');
    expect(mockParseObject.get).toHaveBeenCalledWith('accuracy');
  });
});
