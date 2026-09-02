import 'reflect-metadata';

import Parse from 'parse/node';
import { container } from 'tsyringe';

import Tablet from '../../../src/models/Tablet/Tablet';
import { BatteryInfoService } from '../../../src/services/Tablet/BatteryInfoService';

const equalToMock = jest.fn().mockReturnThis();
const greaterThanOrEqualToMock = jest.fn().mockReturnThis();
const findMock = jest.fn().mockResolvedValue([
  {
    fromParseObject: jest.fn().mockReturnThis(),
  },
]);
const lessThanOrEqualToMock = jest.fn().mockReturnThis();
const descendingMock = jest.fn().mockReturnThis();

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
        find: findMock,
        equalTo: equalToMock,
        greaterThanOrEqualTo: greaterThanOrEqualToMock,
        lessThanOrEqualTo: lessThanOrEqualToMock,
        descending: descendingMock,
      };
    }),
    Object: MockedParseObject,
  };
});

describe('BatteryInfoService', () => {
  let service: BatteryInfoService;

  beforeEach(() => {
    service = container.resolve(BatteryInfoService);
    jest.clearAllMocks();
  });

  it('getBatteryHistory should create a Parse query with correct parameters', async () => {
    const tablet = new Tablet();
    const from = '2023-01-01T00:00:00.000Z';
    const to = '2023-01-31T00:00:00.000Z';

    await service.getBatteryHistory({ tablet, from, to });

    expect(Parse.Query).toHaveBeenCalled();
    expect(Parse.Query).toHaveBeenCalledTimes(1);
    expect(equalToMock).toHaveBeenCalledWith('tablet', tablet);
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
});
