import Parse from 'parse/node';

import WatchUser from '../../../src/models/Watch/WatchUser';

jest.mock('parse/node', () => {
  const MockedParseObject = function (this: any) {
    const data: { [key: string]: any } = {};
    this.get = jest.fn((field) => data[field]);
    this.set = jest.fn((field, value) => {
      data[field] = value;
    });
  };
  const MockedParseUser = function (this: any) {
    const data: { [key: string]: any } = {};
    this.get = jest.fn((field) => data[field]);
    this.set = jest.fn((field, value) => {
      data[field] = value;
    });
    this.id = jest.fn();
  };
  MockedParseObject.registerSubclass = jest.fn();
  MockedParseUser.registerSubclass = jest.fn();
  return {
    Object: MockedParseObject,
    User: MockedParseUser,
  };
});

describe('WatchUser', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    mockParseObject.id = 'testId';
    mockParseObject.set('active', true);

    const mockParseUser = new Parse.Object();
    mockParseUser.id = 'userId';
    mockParseObject.set('user', mockParseUser);

    const mockParseWearer = new Parse.Object();
    mockParseWearer.id = 'wearerId';
    mockParseObject.set('watch', mockParseWearer);

    const mockUserPermission = new Parse.Object();
    mockUserPermission.id = 'permissionId';
    mockUserPermission.set('edit', true);
    mockUserPermission.set('messages', false);
    mockUserPermission.set('location', true);
    mockUserPermission.set('videocall', false);
    mockUserPermission.set('call', true);
    mockParseObject.set('userPermission', mockUserPermission);

    const watchUser = new WatchUser();
    const transformedWatchUser = watchUser.fromParseObject(mockParseObject);

    expect(transformedWatchUser.id).toEqual('testId');
    expect(transformedWatchUser.active).toEqual(true);
    expect(transformedWatchUser.user.id).toEqual('userId');
    expect(transformedWatchUser.watch.id).toEqual('wearerId');
    expect(transformedWatchUser.userPermission.id).toEqual('permissionId');
    expect(transformedWatchUser.userPermission.edit).toEqual(true);
    expect(transformedWatchUser.userPermission.messages).toEqual(false);
    expect(transformedWatchUser.userPermission.location).toEqual(true);
    expect(transformedWatchUser.userPermission.videocall).toEqual(false);
    expect(transformedWatchUser.userPermission.call).toEqual(true);
    expect(mockParseObject.get).toHaveBeenCalledWith('active');
    expect(mockParseObject.get).toHaveBeenCalledWith('user');
    expect(mockParseObject.get).toHaveBeenCalledWith('watch');
    expect(mockParseObject.get).toHaveBeenCalledWith('userPermission');
  });
});
