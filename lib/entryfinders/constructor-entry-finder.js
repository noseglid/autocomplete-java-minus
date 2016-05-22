'use babel';

import { denamespace } from '../util';
import { EntryFinder } from './entry-finder';

class ConstructorEntryFinder extends EntryFinder {
  constructor(dictionary) {
    super(dictionary);
  }

  get(editor, bufferPosition, prefix) {
    return this.dictionary.find(prefix, denamespace)
      .filter(entry => entry.methods.find(method => method.name === '<init>' && method.modifiers.includes('public')))
      .map(entry => ({ ...entry, _type: 'constructor' }));
  }
}

export { ConstructorEntryFinder };
