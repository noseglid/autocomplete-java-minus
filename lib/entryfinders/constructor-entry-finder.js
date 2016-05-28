'use babel';

import { denamespace } from '../util';
import { EntryFinder } from './entry-finder';

class ConstructorEntryFinder extends EntryFinder {
  constructor(registry) {
    super(registry);
  }

  get(editor, bufferPosition, prefix) {
    return this.registry.find(prefix, denamespace)
      .filter(entry => entry.methods.find(method => method.name === '<init>' && method.modifiers.includes('public')))
      .map(entry => ({ ...entry, _type: 'constructor' }));
  }
}

export { ConstructorEntryFinder };
