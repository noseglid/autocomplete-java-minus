'use babel';

import { denamespace } from './util';

class Dictionary {
  constructor(serialized = []) {
    this.items = new Map(serialized);
  }

  set(items = {}) {
    this.items = new Map(items);
  }

  get(key) {
    return this.items.get(key);
  }

  add(key, value) {
    this.items.set(key, value);
  }

  find(prefix, onlyClassName = true) {
    const matches = [];
    for (const [ key, value ] of this.items) {
      const lhs = onlyClassName ? denamespace(key) : key;
      if (lhs.startsWith(prefix)) {
        matches.push(value);
      }
    }
    return matches;
  }

  serialize() {
    return [ ...this.items ];
  }

  clear() {
    this.items.clear();
  }
}

export default Dictionary;
