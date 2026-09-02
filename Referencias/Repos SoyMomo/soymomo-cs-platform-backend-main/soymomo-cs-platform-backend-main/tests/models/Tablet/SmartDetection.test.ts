import Parse from 'parse/node';

import SmartDetection from '../../../src/models/Tablet/SmartDetection';
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
    File: jest.fn(),
  };
});

describe('SmartDetection', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    const mockTabletObject = new Parse.Object();
    const mockFile = new Parse.File('picture.jpg', { base64: 'test' });

    mockParseObject.id = 'testId';
    mockTabletObject.id = 'testTabletId';
    mockTabletObject.set('profileName', 'testProfileName');
    mockParseObject.set('isCorrect', true);
    mockParseObject.set('screenshot', mockFile);
    mockParseObject.set('tablet', mockTabletObject);
    mockParseObject.set('confidence', 0.5);
    mockParseObject.set('modelSize', 0.5);
    mockParseObject.set('appName', 'testAppName');
    mockParseObject.set('packageName', 'testPackageName');
    mockParseObject.set('classType', 'testClassType');
    mockParseObject.set('modelVersionName', 'testModelVersionName');
    mockParseObject.set(
      'coordinates',
      '[["hentai","2.0","0.97808945","385","137","554","286"]]'
    );
    mockParseObject.set('tabletVersionName', 'testTabletVersionName');
    mockParseObject.set('category', 'testCategory');

    const smartDetection = new SmartDetection();
    const transformedSmartDetection =
      smartDetection.fromParseObject(mockParseObject);

    expect(transformedSmartDetection.id).toEqual('testId');
    expect(transformedSmartDetection.isCorrect).toEqual(true);
    expect(transformedSmartDetection.screenshot).toEqual(mockFile);
    expect(transformedSmartDetection.tablet).toBeInstanceOf(Tablet);
    expect(transformedSmartDetection.tablet.id).toEqual('testTabletId');
    expect(transformedSmartDetection.tablet.profileName).toEqual(
      'testProfileName'
    );
    expect(transformedSmartDetection.confidence).toEqual(0.5);
    expect(transformedSmartDetection.modelSize).toEqual(0.5);
    expect(transformedSmartDetection.appName).toEqual('testAppName');
    expect(transformedSmartDetection.packageName).toEqual('testPackageName');
    expect(transformedSmartDetection.classType).toEqual('testClassType');
    expect(transformedSmartDetection.modelVersionName).toEqual(
      'testModelVersionName'
    );
    expect(transformedSmartDetection.coordinates).toEqual(
      '[["hentai","2.0","0.97808945","385","137","554","286"]]'
    );
    expect(transformedSmartDetection.tabletVersionName).toEqual(
      'testTabletVersionName'
    );
    expect(transformedSmartDetection.category).toEqual('testCategory');
    expect(mockParseObject.get).toHaveBeenCalledWith('isCorrect');
    expect(mockParseObject.get).toHaveBeenCalledWith('screenshot');
    expect(mockParseObject.get).toHaveBeenCalledWith('tablet');
    expect(mockParseObject.get).toHaveBeenCalledWith('confidence');
    expect(mockParseObject.get).toHaveBeenCalledWith('modelSize');
    expect(mockParseObject.get).toHaveBeenCalledWith('appName');
    expect(mockParseObject.get).toHaveBeenCalledWith('packageName');
    expect(mockParseObject.get).toHaveBeenCalledWith('classType');
    expect(mockParseObject.get).toHaveBeenCalledWith('modelVersionName');
    expect(mockParseObject.get).toHaveBeenCalledWith('coordinates');
    expect(mockParseObject.get).toHaveBeenCalledWith('tabletVersionName');
    expect(mockParseObject.get).toHaveBeenCalledWith('category');
  });
});
