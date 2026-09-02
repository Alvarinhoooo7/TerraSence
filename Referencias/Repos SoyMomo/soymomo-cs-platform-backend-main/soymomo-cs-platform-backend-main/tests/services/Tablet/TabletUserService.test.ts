import 'reflect-metadata';

import Parse from 'parse/node';
import { container } from 'tsyringe';

import Tablet from '../../../src/models/Tablet/Tablet';
import TabletUser from '../../../src/models/Tablet/TabletUser';
import { TabletUserService } from '../../../src/services/Tablet/TabletUserService';

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
  };
});

describe('TabletUserService', () => {
  let service: TabletUserService;

  beforeEach(() => {
    service = container.resolve(TabletUserService);
  });

  it('getTabletusers should create a Parse query with correct parameters', async () => {
    await service.getTabletUsers();

    expect(Parse.Query).toHaveBeenCalledWith(TabletUser);
    expect(includeMock).toHaveBeenCalledWith('tablet');
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('getTabletUserByHidOrRecoveryEmail should create a Parse query with correct parameters with recoveryEmail', async () => {
    const recoveryEmail = 'test@test.com';

    await service.getTabletUserByHidOrRecoveryEmail({
      recoveryEmail: 'test@test.com',
    });

    expect(Parse.Query).toHaveBeenCalledTimes(2);
    expect(Parse.Query).toHaveBeenCalledWith(TabletUser);
    expect(Parse.Query).toHaveBeenCalledWith(Tablet);
    expect(includeMock).toHaveBeenCalledWith('tablet');
    expect(equalToMock).toHaveBeenCalledTimes(1);
    expect(equalToMock).toHaveBeenCalledWith('recoveryEmail', recoveryEmail);
    expect(matchesQueryMock).toHaveBeenCalledWith('tablet', expect.anything());
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('getTabletUserByHidOrRecoveryEmail should create a Parse query with correct parameters with hid', async () => {
    const hid = '1234567890';

    await service.getTabletUserByHidOrRecoveryEmail({
      hid,
    });

    expect(Parse.Query).toHaveBeenCalledTimes(2);
    expect(Parse.Query).toHaveBeenCalledWith(TabletUser);
    expect(Parse.Query).toHaveBeenCalledWith(Tablet);
    expect(includeMock).toHaveBeenCalledWith('tablet');
    expect(equalToMock).toHaveBeenCalledTimes(1);
    expect(equalToMock).toHaveBeenCalledWith('hid', hid);
    expect(matchesQueryMock).toHaveBeenCalledWith('tablet', expect.anything());
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });
});
