'use babel';

import { denamespace } from './util';

class Dictionary {
  constructor(serialized = []) {
    this.items = new Map(serialized);
  }

  set(items = {}) {
    this.items = items;
  }

  get(key) {
    return this.items.get(key);
  }

  add(key, value) {
    this.items.set(key, value);
  }

  find(prefix) {
    const matches = [];
    for (const [ key, value ] of this.items) {
      if (denamespace(key).startsWith(prefix)) {
        matches.push(value);
      }
    }

    return matches.sort((lhs, rhs) => lhs.name.length - rhs.name.length);
  }

  serialize() {
    return [ ...this.items ];
  }

  clear() {
    this.item = {};
  }
}

export default Dictionary;
