import 'reflect-metadata';

import Parse from 'parse/node';

import TabletUser from '../../../src/models/Tablet/TabletUser';

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

describe('TabletUser', () => {
  it('should correctly get and set firstName', () => {
    const tabletUser = new TabletUser();
    tabletUser.isActive = true;

    expect(tabletUser.isActive).toEqual(true);
    expect(tabletUser.set).toHaveBeenCalledWith('isActive', true);
    expect(tabletUser.get).toHaveBeenCalledWith('isActive');
  });

  it('should correctly transform from Parse.Object', () => {
    const tabletUser = new TabletUser();
    const mockParseObject = new Parse.Object();
    const tablet = new Parse.Object();
    tablet.id = 'testTabletId';
    tablet.set('profileName', 'testTabletName');
    mockParseObject.id = 'testId';
    mockParseObject.set('isActive', true);
    mockParseObject.set('tablet', tablet);

    const transformedTabletUser = tabletUser.fromParseObject(mockParseObject);

    expect(transformedTabletUser.id).toEqual('testId');
    expect(transformedTabletUser.isActive).toEqual(true);
    expect(transformedTabletUser.tablet.id).toEqual('testTabletId');
    expect(transformedTabletUser.tablet.profileName).toEqual('testTabletName');
  });
});
