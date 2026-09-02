import 'reflect-metadata';

import Parse from 'parse/node';
import { container } from 'tsyringe';

import { WatchUserService } from '../../../src/services/Watch/WatchUserService';

const includeMock = jest.fn().mockReturnThis();
const equalToMock = jest.fn().mockReturnThis();
const matchesQueryMock = jest.fn().mockReturnThis();
const findMock = jest.fn().mockResolvedValue([
  {
    fromParseObject: jest.fn().mockReturnThis(),
  },
]);

jest.mock('parse/node', () => {
  const MockedParseObject = function () {
    return {
      set: jest.fn().mockImplementation(() => {}),
      get: jest.fn().mockImplementation(() => {}),
    };
  };
  MockedParseObject.registerSubclass = jest.fn();
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
    Query: jest.fn().mockImplementation(() => {
      return {
        include: includeMock,
        find: findMock,
        equalTo: equalToMock,
        matchesQuery: matchesQueryMock,
      };
    }),
    Object: MockedParseObject,
    User: MockedParseUser,
  };
});

describe('WatchUserService', () => {
  let service: WatchUserService;

  beforeEach(() => {
    service = container.resolve(WatchUserService);
  });

  it('getWatchUsers should create a Parse query with correct parameters', async () => {
    const response = await service.getWatchUsers();
    expect(response).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(includeMock).toHaveBeenCalledTimes(2);
    expect(includeMock).toHaveBeenCalledWith('watch');
    expect(includeMock).toHaveBeenCalledWith('user');
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('getWatchUserByEmailOrDeviceIdOrImei should create a Parse query with correct parameters', async () => {
    const email = 'test@test.com';
    const deviceId = '1234';
    const imei = '5678';

    const emailResponse = await service.getWatchUserByEmailOrDeviceIdOrImei({
      email,
    });
    expect(emailResponse).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('email', email);
    expect(matchesQueryMock).toHaveBeenCalled();

    const deviceIdResponse = await service.getWatchUserByEmailOrDeviceIdOrImei({
      deviceId,
    });
    expect(deviceIdResponse).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('deviceId', deviceId);
    expect(matchesQueryMock).toHaveBeenCalled();

    const imeiResponse = await service.getWatchUserByEmailOrDeviceIdOrImei({
      imei,
    });
    expect(imeiResponse).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('imei', imei);
    expect(matchesQueryMock).toHaveBeenCalled();
  });
});
