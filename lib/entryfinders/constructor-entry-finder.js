'use babel';

import { denamespace } from '../util';
import { EntryFinder } from './entry-finder';

class ConstructorEntryFinder extends EntryFinder {
  constructor(...args) {
    super(...args);
  }

  get(editor, bufferPosition, prefix) {
    return this.registry.filter(fullyQualifiedClass => denamespace(fullyQualifiedClass).startsWith(prefix))
      .filter(entry => entry.methods.find(method => method.name === '<init>' && method.modifiers.includes('public')))
      .map(entry => ({ ...entry, _type: 'constructor' }));
  }
}

export { ConstructorEntryFinder };
