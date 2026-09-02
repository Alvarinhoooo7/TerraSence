import Parse from 'parse/node';

import User from '../../../src/models/Watch/User';

jest.mock('parse/node', () => {
  const MockedParseUser = function (this: any) {
    const data: { [key: string]: any } = {};
    this.get = jest.fn((field) => data[field]);
    this.set = jest.fn((field, value) => {
      data[field] = value;
    });
    this.id = jest.fn();
  };
  MockedParseUser.registerSubclass = jest.fn();
  return {
    User: MockedParseUser,
    Object: MockedParseUser,
  };
});

describe('User', () => {
  it('should correctly transform from Parse.User', () => {
    const mockParseUser = new Parse.User();
    mockParseUser.set('firstName', 'John');
    mockParseUser.set('lastName', 'Doe');
    mockParseUser.set('phone', '123456789');
    mockParseUser.set('acceptedNewToS', true);
    mockParseUser.set('fb', true);
    mockParseUser.set('image', {});
    mockParseUser.set('hasRequestedDeletion', true);
    mockParseUser.set('birthday', new Date('1990-01-01'));
    mockParseUser.set('email', 'test@test.com');
    mockParseUser.id = 'testId';

    const testUser = new User();
    const transformedUser = testUser.fromParseObject(mockParseUser);

    expect(transformedUser.id).toEqual('testId');
    expect(transformedUser.firstName).toEqual('John');
    expect(transformedUser.lastName).toEqual('Doe');
    expect(transformedUser.phone).toEqual('123456789');
    expect(transformedUser.acceptedNewToS).toEqual(true);
    expect(transformedUser.fb).toEqual(true);
    expect(transformedUser.image).toEqual({});
    expect(transformedUser.hasRequestedDeletion).toEqual(true);
    expect(transformedUser.birthday).toEqual(new Date('1990-01-01'));
    expect(transformedUser.email).toEqual('test@test.com');
    expect(mockParseUser.get).toHaveBeenCalledWith('firstName');
    expect(mockParseUser.get).toHaveBeenCalledWith('lastName');
    expect(mockParseUser.get).toHaveBeenCalledWith('phone');
    expect(mockParseUser.get).toHaveBeenCalledWith('acceptedNewToS');
    expect(mockParseUser.get).toHaveBeenCalledWith('fb');
    expect(mockParseUser.get).toHaveBeenCalledWith('image');
    expect(mockParseUser.get).toHaveBeenCalledWith('hasRequestedDeletion');
    expect(mockParseUser.get).toHaveBeenCalledWith('birthday');
    expect(mockParseUser.get).toHaveBeenCalledWith('email');
  });
});
