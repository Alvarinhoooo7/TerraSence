import Parse from 'parse/node';

import Contact from '../../../src/models/Watch/Contact';

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
    File: jest.fn(),
  };
});

describe('Contact', () => {
  it('should correctly transform from Parse.Object', () => {
    const mockParseObject = new Parse.Object();
    const mockFile = new Parse.File('picture.jpg', { base64: 'test' });
    mockParseObject.id = 'testId';
    mockParseObject.set('chatEnabled', true);
    mockParseObject.set('position', 1);
    mockParseObject.set('name', 'Test Name');
    mockParseObject.set('phone', '123456789');
    mockParseObject.set('sos', false);
    mockParseObject.set('picture', mockFile);

    const contact = new Contact();
    const transformedContact = contact.fromParseObject(mockParseObject);

    expect(transformedContact.id).toEqual('testId');
    expect(transformedContact.chatEnabled).toEqual(true);
    expect(transformedContact.position).toEqual(1);
    expect(transformedContact.name).toEqual('Test Name');
    expect(transformedContact.phone).toEqual('123456789');
    expect(transformedContact.sos).toEqual(false);
    expect(transformedContact.picture).toEqual(mockFile);
    expect(mockParseObject.get).toHaveBeenCalledWith('chatEnabled');
    expect(mockParseObject.get).toHaveBeenCalledWith('position');
    expect(mockParseObject.get).toHaveBeenCalledWith('name');
    expect(mockParseObject.get).toHaveBeenCalledWith('phone');
    expect(mockParseObject.get).toHaveBeenCalledWith('sos');
    expect(mockParseObject.get).toHaveBeenCalledWith('picture');
  });
});
