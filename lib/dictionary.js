'use babel';

import { denamespace } from './util';

class Dictionary {
  constructor(state) {
    this.items = new Map();
  }

  set(items = {}) {
    this.items = items;
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

  clear() {
    this.item = {};
  }
}

export default Dictionary;
