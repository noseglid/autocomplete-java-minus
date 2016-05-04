'use babel';

import Provider from './provider';
import Dictionary from './dictionary';
import { collect } from './collector';

export default {

  activate(state) {
    this.dictionary = new Dictionary(state);
    this.provider = new Provider(this.dictionary);
    console.time('autocomplete-java-minus collect')
    collect(this.dictionary)
      .then(() => console.timeEnd('autocomplete-java-minus collect'))
      .catch(err => atom.notifications.addError('Failed to collect java classes', {
        detail: err.stack,
        dismissable: true
      }));
  },

  deactivate() {
  },

  serialize() {
  },

  provide() {
    return this.provider;
  },

  consumeJavaImport(javaImport) {
    this.provider.setImportHandler(javaImport);
  }

};
