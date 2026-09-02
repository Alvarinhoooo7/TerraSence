import Parse from 'parse/node';

import BatteryInfo from '../../../src/models/Tablet/BatteryInfo';
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

describe('BatteryInfo', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    const mockTabletObject = new Parse.Object();
    mockParseObject.id = 'testId';
    mockTabletObject.id = 'testTabletId';
    mockTabletObject.set('profileName', 'testTabletName');
    mockParseObject.set('tablet', mockTabletObject);
    mockParseObject.set('percentage', 80);
    mockParseObject.set('chargingMethod', 'AC');
    mockParseObject.set('health', 'Good');
    mockParseObject.set('createdAtOnTablet', new Date());

    const batteryInfo = new BatteryInfo();
    const transformedBatteryInfo = batteryInfo.fromParseObject(mockParseObject);

    expect(transformedBatteryInfo.id).toEqual('testId');
    expect(transformedBatteryInfo.tablet).toBeInstanceOf(Tablet);
    expect(transformedBatteryInfo.tablet.id).toEqual('testTabletId');
    expect(transformedBatteryInfo.tablet.profileName).toEqual('testTabletName');
    expect(transformedBatteryInfo.percentage).toEqual(80);
    expect(transformedBatteryInfo.chargingMethod).toEqual('AC');
    expect(transformedBatteryInfo.health).toEqual('Good');
    expect(transformedBatteryInfo.createdAtOnTablet).toEqual(
      mockParseObject.get('createdAtOnTablet')
    );
    expect(mockParseObject.get).toHaveBeenCalledWith('tablet');
    expect(mockParseObject.get).toHaveBeenCalledWith('percentage');
    expect(mockParseObject.get).toHaveBeenCalledWith('chargingMethod');
    expect(mockParseObject.get).toHaveBeenCalledWith('health');
    expect(mockParseObject.get).toHaveBeenCalledWith('createdAtOnTablet');
  });
});
