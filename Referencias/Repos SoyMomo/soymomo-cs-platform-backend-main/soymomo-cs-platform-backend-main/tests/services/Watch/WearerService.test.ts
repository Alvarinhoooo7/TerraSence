import 'reflect-metadata';

import Parse from 'parse/node';
import { container } from 'tsyringe';

import WatchSettings from '../../../src/models/Watch/WatchSettings';
import Wearer from '../../../src/models/Watch/Wearer';
import { WearerService } from '../../../src/services/Watch/WearerService';

const includeMock = jest.fn().mockReturnThis();
const equalToMock = jest.fn().mockReturnThis();
const matchesQueryMock = jest.fn().mockReturnThis();
const findMock = jest.fn().mockResolvedValue([
  {
    fromParseObject: jest.fn().mockReturnThis(),
  },
]);
const queryMock = jest.fn().mockReturnThis();

jest.mock('parse/node', () => {
  const MockedParseObject = function () {
    return {
      set: jest.fn().mockImplementation(() => {}),
      get: jest.fn().mockImplementation(() => {}),
      relation: jest.fn().mockImplementation(() => {
        return {
          query: queryMock,
          find: findMock,
        };
      }),
      save: jest.fn().mockImplementation(() => {}),
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
    Cloud: {
      run: jest.fn(),
    },
  };
});

describe('WearerService', () => {
  let service: WearerService;

  beforeEach(() => {
    service = container.resolve(WearerService);
    jest.clearAllMocks();
  });

  it('getWearerByDeviceIdOrImei should create a Parse query with correct parameters with deviceId on getWearerByDeviceIdOrImei', async () => {
    const deviceId = 'deviceId123';

    await service.getWearerByDeviceIdOrImei({ deviceId });

    expect(Parse.Query).toHaveBeenCalled();
    expect(Parse.Query).toHaveBeenCalledWith(Wearer);
    expect(Parse.Query).toHaveBeenCalledTimes(1);
    expect(includeMock).toHaveBeenCalledTimes(3);
    expect(includeMock).toHaveBeenCalledWith('settings');
    expect(includeMock).toHaveBeenCalledWith('userInCharge');
    expect(equalToMock).toHaveBeenCalledWith('deviceId', deviceId);
    expect(equalToMock).toHaveBeenCalledTimes(1);
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('getWearerByDeviceIdOrImei should create a Parse query with correct parameters with imei on getWearerByDeviceIdOrImei', async () => {
    const imei = 'imei123';

    await service.getWearerByDeviceIdOrImei({ imei });

    expect(Parse.Query).toHaveBeenCalled();
    expect(Parse.Query).toHaveBeenCalledWith(Wearer);
    expect(Parse.Query).toHaveBeenCalledTimes(1);
    expect(includeMock).toHaveBeenCalledTimes(3);
    expect(includeMock).toHaveBeenCalledWith('settings');
    expect(includeMock).toHaveBeenCalledWith('userInCharge');
    expect(equalToMock).toHaveBeenCalledWith('imei', imei);
    expect(equalToMock).toHaveBeenCalledTimes(1);
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('powerOff should call the correct Parse Cloud function on powerOff', async () => {
    const deviceId = 'deviceId123';
    await service.powerOff({ deviceId });

    expect(Parse.Cloud.run).toHaveBeenCalledWith('wPowerOff', { deviceId });
  });

  it('getContacts should call getWearerByDeviceIdOrImei and create a relation query on getContacts', async () => {
    const deviceId = 'deviceId123';
    const imei = 'imei123';
    const mockWearer = new Wearer();

    jest
      .spyOn(service, 'getWearerByDeviceIdOrImei')
      .mockResolvedValue([mockWearer]);

    await service.getContacts({ deviceId, imei });

    expect(service.getWearerByDeviceIdOrImei).toHaveBeenCalledWith({
      deviceId,
      imei,
    });
    expect(mockWearer.relation).toHaveBeenCalledWith('contacts');
    expect(queryMock).toHaveBeenCalled();
    expect(findMock).toHaveBeenCalledWith({ useMasterKey: true });
  });

  it('updateWearerUserInformation should call getWearerByDeviceIdOrImei and update the wearer on updateWearerUserInformation', async () => {
    const deviceId = 'deviceId123';
    const imei = 'imei123';
    const firstName = 'firstName123';
    const lastName = 'lastName123';
    const phone = 'phone123';
    const model = 1;
    const mockWearer = new Wearer();

    jest
      .spyOn(service, 'getWearerByDeviceIdOrImei')
      .mockResolvedValue([mockWearer]);

    await service.updateWearerUserInformation({
      deviceId,
      imei,
      firstName,
      lastName,
      phone,
      model,
    });

    expect(service.getWearerByDeviceIdOrImei).toHaveBeenCalledWith({
      deviceId,
      imei,
    });

    expect(mockWearer.firstName).toEqual(firstName);
    expect(mockWearer.lastName).toEqual(lastName);
    expect(mockWearer.phone).toEqual(phone);
    expect(mockWearer.model).toEqual(model);
    expect(mockWearer.save).toHaveBeenCalledWith(null, {
      useMasterKey: true,
    });
  });

  it('should call return null if getWearerByDeviceIdOrImei returns more than one wearer on updateWearerUserInformation', async () => {
    const deviceId = 'deviceId123';
    const imei = 'imei123';
    const firstName = 'firstName123';
    const lastName = 'lastName123';
    const phone = 'phone123';
    const model = 1;
    const mockWearer1 = new Wearer();
    const mockWearer2 = new Wearer();
    jest
      .spyOn(service, 'getWearerByDeviceIdOrImei')
      .mockResolvedValue([mockWearer1, mockWearer2]);

    const result = await service.updateWearerUserInformation({
      deviceId,
      imei,
      firstName,
      lastName,
      phone,
      model,
    });

    expect(service.getWearerByDeviceIdOrImei).toHaveBeenCalledWith({
      deviceId,
      imei,
    });

    expect(mockWearer1.firstName).not.toEqual(firstName);
    expect(mockWearer1.lastName).not.toEqual(lastName);
    expect(mockWearer1.phone).not.toEqual(phone);
    expect(mockWearer1.model).not.toEqual(model);
    expect(mockWearer1.save).not.toHaveBeenCalledWith(null, {
      useMasterKey: true,
    });
    expect(result).toEqual(null);
  });

  it('should return null if getWearerByDeviceIdOrImei returns no wearer on updateWearerUserInformation', async () => {
    const deviceId = 'deviceId123';
    const imei = 'imei123';
    const firstName = 'firstName123';
    const lastName = 'lastName123';
    const phone = 'phone123';
    const model = 1;
    jest.spyOn(service, 'getWearerByDeviceIdOrImei').mockResolvedValue([]);

    const result = await service.updateWearerUserInformation({
      deviceId,
      imei,
      firstName,
      lastName,
      phone,
      model,
    });

    expect(service.getWearerByDeviceIdOrImei).toHaveBeenCalledWith({
      deviceId,
      imei,
    });

    expect(result).toEqual(null);
  });

  it('should call return null if getWearerByDeviceIdOrImei returns more than one wearer on updateWearerSettings', async () => {
    const deviceId = 'deviceId123';
    const imei = 'imei123';

    const mockWearer1 = new Wearer();
    const mockWearer2 = new Wearer();
    jest
      .spyOn(service, 'getWearerByDeviceIdOrImei')
      .mockResolvedValue([mockWearer1, mockWearer2]);

    const result = await service.updateWearerSettings({
      deviceId,
      imei,
    });

    expect(service.getWearerByDeviceIdOrImei).toHaveBeenCalledWith({
      deviceId,
      imei,
    });
    expect(result).toEqual(null);
  });

  it('should return null if getWearerByDeviceIdOrImei returns no wearer on updateWearerSettings', async () => {
    const deviceId = 'deviceId123';
    const imei = 'imei123';

    jest.spyOn(service, 'getWearerByDeviceIdOrImei').mockResolvedValue([]);

    const result = await service.updateWearerSettings({
      deviceId,
      imei,
    });

    expect(service.getWearerByDeviceIdOrImei).toHaveBeenCalledWith({
      deviceId,
      imei,
    });
    expect(result).toEqual(null);
  });

  it('should update wearer settings on updateWearerSettings on updateWearerSettings', async () => {
    const deviceId = 'deviceId123';
    const imei = 'imei123';
    const gpsFrequencySeconds = 300;
    const soundMode = 1;
    const batterySaveEnabled = true;
    const language = 'language123';
    const timeZone = 'timeZone123';
    const amPm = true;
    const dialpadEnabled = true;
    const mockWearer = new Wearer();
    const mockSettings = new WatchSettings();
    mockWearer.settings = mockSettings;

    jest
      .spyOn(service, 'getWearerByDeviceIdOrImei')
      .mockResolvedValue([mockWearer]);

    const result = await service.updateWearerSettings({
      deviceId,
      imei,
      gpsFrequencySeconds,
      soundMode,
      batterySaveEnabled,
      language,
      timeZone,
      amPm,
      dialpadEnabled,
    });

    expect(service.getWearerByDeviceIdOrImei).toHaveBeenCalledWith({
      deviceId,
      imei,
    });

    expect(mockWearer.settings.gpsFrequencySeconds).toEqual(
      gpsFrequencySeconds
    );
    expect(mockWearer.settings.soundMode).toEqual(soundMode);
    expect(mockWearer.settings.batterySaveEnabled).toEqual(batterySaveEnabled);
    expect(mockWearer.settings.language).toEqual(language);
    expect(mockWearer.settings.timeZone).toEqual(timeZone);
    expect(mockWearer.settings.amPm).toEqual(amPm);
    expect(mockWearer.settings.dialpadEnabled).toEqual(dialpadEnabled);
    expect(result).toEqual(mockWearer.settings);
  });

  it('sendMessageToWearer should call a function to send a message to wearer', async () => {
    const deviceId = 'deviceId123';
    const message = 'message123';

    await service.sendMessageToWearer({
      deviceId,
      message,
    });

    expect(Parse.Cloud.run).toHaveBeenCalledWith('wMessage', {
      deviceId,
      message,
    });
  });
});
