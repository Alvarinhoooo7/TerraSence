import 'reflect-metadata';
import '../src/container'; // replace with your file

import Parse from 'parse/node';
import { container } from 'tsyringe';

describe('Container registration', () => {
  it('should register Parse correctly', () => {
    const instance = container.resolve('Parse');
    expect(instance).toBe(Parse);
  });

  // Add more tests as needed for other registrations
});
