import 'reflect-metadata';

import Parse from 'parse/node';
import { container } from 'tsyringe';

import { HistoryLocationService } from '../../../src/services/Watch/HistoryLocationService';

const equalToMock = jest.fn().mockReturnThis();
const greaterThanOrEqualToMock = jest.fn().mockReturnThis();
const lessThanOrEqualToMock = jest.fn().mockReturnThis();
const descendingMock = jest.fn().mockReturnThis();
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
        equalTo: equalToMock,
        greaterThanOrEqualTo: greaterThanOrEqualToMock,
        lessThanOrEqualTo: lessThanOrEqualToMock,
        descending: descendingMock,
        find: findMock,
      };
    }),
    Object: MockedParseObject,
  };
});

describe('HistoryBatteryService', () => {
  let service: HistoryLocationService;

  beforeEach(() => {
    service = container.resolve(HistoryLocationService);
  });

  it('getLocationHistory should create a Parse query with correct parameters', async () => {
    const deviceId = '1234';
    const from = '2023-06-01';
    const to = '2023-06-10';

    const response = await service.getLocationHistory({ deviceId, from, to });

    expect(response).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('deviceId', deviceId);
    expect(greaterThanOrEqualToMock).toHaveBeenCalledWith(
      'createdAt',
      new Date(from)
    );
    expect(lessThanOrEqualToMock).toHaveBeenCalledWith(
      'createdAt',
      new Date(to)
    );
    expect(descendingMock).toHaveBeenCalledWith('createdAt');
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('getLocationHistory without from should create correct', async () => {
    const deviceId = '1234';
    const to = '2023-06-10';

    const response = await service.getLocationHistory({ deviceId, to });

    expect(response).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('deviceId', deviceId);
    expect(greaterThanOrEqualToMock).not.toHaveBeenCalled();
    expect(lessThanOrEqualToMock).toHaveBeenCalledWith(
      'createdAt',
      new Date(to)
    );
    expect(descendingMock).toHaveBeenCalledWith('createdAt');
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('getLocationHistory without to should create correct', async () => {
    const deviceId = '1234';
    const from = '2023-06-01';

    const response = await service.getLocationHistory({ deviceId, from });

    expect(response).toBeDefined();
    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('deviceId', deviceId);
    expect(greaterThanOrEqualToMock).toHaveBeenCalledWith(
      'createdAt',
      new Date(from)
    );
    expect(lessThanOrEqualToMock).not.toHaveBeenCalled();
    expect(descendingMock).toHaveBeenCalledWith('createdAt');
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });
});
