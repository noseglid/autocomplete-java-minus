'use babel';

import jdjs from 'jdjs';

function collect(entries) {
  return Promise.resolve(entries)
    .then(result => Promise.all(result.map(entry => jdjs(entry.trim()))))
    .then(result => {
      result.map(descriptions => descriptions
        .filter(entry => entry.modifiers.includes('public'))
        .forEach(entry => emit('entry', entry))); // eslint-disable-line no-undef
    });
}

module.exports = function (entries) {
  const callback = this.async();
  collect(entries).then(callback);
};
