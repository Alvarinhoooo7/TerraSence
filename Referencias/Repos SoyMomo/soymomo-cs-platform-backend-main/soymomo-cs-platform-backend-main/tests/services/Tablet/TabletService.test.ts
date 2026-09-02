import 'reflect-metadata';

import Parse from 'parse/node';
import { container } from 'tsyringe';

import { TabletService } from '../../../src/services/Tablet/TabletService';

let firstMock = jest.fn().mockResolvedValue({
  fromParseObject: jest.fn().mockReturnThis(),
  isNew: jest.fn().mockReturnValue(false),
});
const includeMock = jest.fn().mockReturnThis();
const equalToMock = jest.fn().mockReturnThis();
const descendingMock = jest.fn().mockReturnThis();
const matchesQueryMock = jest.fn().mockReturnThis();
const findMock = jest.fn().mockResolvedValue([
  {
    fromParseObject: jest.fn().mockReturnThis(),
  },
]);
let isNewMock = jest.fn().mockReturnValue(false);

jest.mock('parse/node', () => {
  const MockedParseObject = function () {
    return {
      set: jest.fn().mockImplementation(() => {}),
      get: jest.fn().mockImplementation(() => {}),
      isNew: isNewMock,
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
        descending: descendingMock,
        first: firstMock,
      };
    }),
    Object: MockedParseObject,
  };
});

describe('TabletService', () => {
  let service: TabletService;

  beforeEach(() => {
    service = container.resolve(TabletService);
    jest.clearAllMocks();
  });

  it('getTabletByHidOrRecoveryEmail should create a Parse query with correct parameters', async () => {
    const hid = '1234';
    const recoveryEmail = 'test@test.com';

    const emailResponse = await service.getTabletByHidOrRecoveryEmail({
      recoveryEmail,
    });

    expect(emailResponse).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('recoveryEmail', recoveryEmail);
    expect(descendingMock).toHaveBeenCalledWith('updatedAt');
    expect(includeMock).toHaveBeenCalledWith('tablet');
    expect(firstMock).toHaveBeenCalledWith({ useMasterKey: true });

    const hidResponse = await service.getTabletByHidOrRecoveryEmail({ hid });

    expect(hidResponse).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('hid', hid);
    expect(descendingMock).toHaveBeenCalledWith('updatedAt');
    expect(includeMock).toHaveBeenCalledWith('tablet');
    expect(firstMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('should return null if tablet is new', async () => {
    isNewMock = jest.fn().mockReturnValue(true);
    firstMock = jest.fn().mockResolvedValue(null);

    const result = await service.getTabletByHidOrRecoveryEmail({ hid: '1234' });

    expect(result).toBeNull();
  });

  it('updateTabletUserInformation should update the tablet info', async () => {
    const setMock = jest.fn();
    const saveMock = jest.fn().mockResolvedValue({
      fromParseObject: jest.fn().mockReturnThis(),
    });

    firstMock = jest.fn().mockResolvedValue({
      fromParseObject: jest.fn().mockReturnThis(),
      isNew: jest.fn().mockReturnValue(false),
      set: setMock,
      save: saveMock,
    });

    const hid = '123';
    const profileName = 'John Doe';
    const recoveryEmail = 'test@example.com';
    const pin = '1234';

    const result = await service.updateTabletUserInformation({
      hid,
      profileName,
      recoveryEmail,
      pin,
    });

    expect(result).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(firstMock).toHaveBeenCalledWith({ useMasterKey: true });
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(null, { useMasterKey: true });
  });

  it('should return null if no tablet is found', async () => {
    firstMock = jest.fn().mockResolvedValue(null);

    const result = await service.updateTabletUserInformation({
      hid: '123',
      profileName: 'John Doe',
      recoveryEmail: 'test@example.com',
      pin: '1234',
    });

    expect(result).toBeNull();
  });
});
