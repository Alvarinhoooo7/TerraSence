import Parse from 'parse/node';
import { container } from 'tsyringe';

container.register('Parse', { useValue: Parse });

// Add more registrations as needed
