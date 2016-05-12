'use babel';

import jdjs from 'jdjs';

function collect(entries) {
  return Promise.resolve(entries)
    .then(result => Promise.all(result.map(entry =>
      jdjs(entry).catch(err => {
        console.warn('Failed to parse', entry, err.message);
        return [];
      })
    )))
    .then(result => {
      result.map(descriptions => descriptions
        .filter(entry => entry.modifiers.includes('public'))
        .forEach(entry => emit('entry', entry))); // eslint-disable-line no-undef
    })
    .catch(err => {
      console.error('collector-task failed:', err.stack);
    });
}

module.exports = function (entries) {
  const callback = this.async();

  if (0 === entries.length) {
    return callback();
  }

  return collect(entries).then(() => {
    callback();
  });
};
