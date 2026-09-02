import 'reflect-metadata';

import Parse from 'parse/node';
import { container } from 'tsyringe';

import Tablet from '../../../src/models/Tablet/Tablet';
import { SmartDetectionService } from '../../../src/services/Tablet/SmartDetectionService';

const equalToMock = jest.fn().mockReturnThis();
const greaterThanOrEqualToMock = jest.fn().mockReturnThis();
const lessThanOrEqualToMock = jest.fn().mockReturnThis();
const limitMock = jest.fn().mockReturnThis();
const descendingMock = jest.fn().mockReturnThis();
const findMock = jest.fn().mockResolvedValue([
  {
    fromParseObject: jest.fn().mockReturnThis(),
  },
]);

jest.mock('parse/node', () => {
  const MockedParseObject = function (this: any) {
    const data: { [key: string]: any } = {};
    this.id = jest.fn((field) => data[field]);
    this.get = jest.fn((field) => data[field]);
    this.set = jest.fn((field, value) => {
      data[field] = value;
    });
    this.toJSON = jest.fn(() => {
      return {
        objectId: this.id,
        tablet: this.tablet.toJSON(),
        createdAt: this.createdAt,
      };
    });
  };
  MockedParseObject.registerSubclass = jest.fn();
  return {
    Query: jest.fn().mockImplementation(() => {
      return {
        equalTo: equalToMock,
        greaterThanOrEqualTo: greaterThanOrEqualToMock,
        lessThanOrEqualTo: lessThanOrEqualToMock,
        descending: descendingMock,
        limit: limitMock,
        find: findMock,
      };
    }),
    Object: MockedParseObject,
  };
});

describe('SmartDetectionService', () => {
  let service: SmartDetectionService;

  beforeEach(() => {
    service = container.resolve(SmartDetectionService);
  });

  it('getSmartDetections should create a Parse query with correct parameters', async () => {
    const tabletMock = new Tablet();

    const params = {
      tablet: tabletMock,
      from: '2023-06-06T10:43:41.198Z',
      to: '2023-06-10T10:43:41.198Z',
      limit: 10,
    };

    await service.getSmartDetections(params);

    expect(Parse.Query).toHaveBeenCalled();
    expect(equalToMock).toHaveBeenCalledWith('tablet', tabletMock);
    expect(greaterThanOrEqualToMock).toHaveBeenCalledWith(
      'createdAt',
      new Date(params.from)
    );
    expect(lessThanOrEqualToMock).toHaveBeenCalledWith(
      'createdAt',
      new Date(params.to)
    );
    expect(limitMock).toHaveBeenCalledWith(params.limit);
    expect(descendingMock).toHaveBeenCalledWith('createdAt');
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });
});
