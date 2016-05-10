'use babel';

import Provider from './provider';
import Dictionary from './dictionary';
import { collect } from './collector';

export default {

  BUSY_COLLECT_ID: 'autocomplete-java-minus.collect',
  BUSY_COLLECT_DESCRIPTION: 'Collecting Java Classes, Methods and Properties...',

  activate(state) {
    this.dictionary = new Dictionary(state.dictionary);
    this.provider = new Provider(this.dictionary);

    atom.commands.add('atom-workspace', 'autocomplete-java-minus:refresh', () => this.collect());

    // Start of with an initial collect
    this.collect();
  },

  deactivate() {
  },

  serialize() {
    return { dictionary: [] };
  },

  collect() {
    this.dictionary.clear();
    this.busyRegistry && this.busyRegistry.begin(this.BUSY_COLLECT_ID, this.BUSY_COLLECT_DESCRIPTION);
    this.collectPromise = collect(this.dictionary)
      .then(() => {
        this.collectPromise = null;
        this.busyRegistry && this.busyRegistry.end(this.BUSY_COLLECT_ID);
      })
      .catch(err => atom.notifications.addError('Failed to collect java classes', {
        detail: err.stack,
        dismissable: true
      }));
  },

  provide() {
    return this.provider;
  },

  consumeJavaImport(javaImport) {
    this.provider.setImportHandler(javaImport);
  },

  consumeBusy(registry) {
    this.busyRegistry = registry;
    if (this.collectPromise) {
      this.busyRegistry.begin(this.BUSY_COLLECT_ID, this.BUSY_COLLECT_DESCRIPTION);
    }
  }

};
