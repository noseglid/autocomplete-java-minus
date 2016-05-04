'use babel';

import Provider from './provider';
import Dictionary from './dictionary';
import { collect } from './collector';

export default {

  activate(state) {
    this.dictionary = new Dictionary(state);
    this.provider = new Provider(this.dictionary);
    collect(this.dictionary);
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
