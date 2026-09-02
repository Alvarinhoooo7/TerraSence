import Parse from 'parse/node';

import UserPermission from '../../../src/models/Watch/UserPermission';

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

describe('UserPermission', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    mockParseObject.id = 'testId';
    mockParseObject.set('edit', true);
    mockParseObject.set('messages', false);
    mockParseObject.set('location', true);
    mockParseObject.set('videocall', false);
    mockParseObject.set('call', true);

    const userPermission = new UserPermission();
    const transformedUserPermission =
      userPermission.fromParseObject(mockParseObject);

    expect(transformedUserPermission.id).toEqual('testId');
    expect(transformedUserPermission.edit).toEqual(true);
    expect(transformedUserPermission.messages).toEqual(false);
    expect(transformedUserPermission.location).toEqual(true);
    expect(transformedUserPermission.videocall).toEqual(false);
    expect(transformedUserPermission.call).toEqual(true);
    expect(mockParseObject.get).toHaveBeenCalledWith('edit');
    expect(mockParseObject.get).toHaveBeenCalledWith('messages');
    expect(mockParseObject.get).toHaveBeenCalledWith('location');
    expect(mockParseObject.get).toHaveBeenCalledWith('videocall');
    expect(mockParseObject.get).toHaveBeenCalledWith('call');
  });
});
