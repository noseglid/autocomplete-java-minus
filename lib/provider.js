'use babel';

import { denamespace, packagify } from './util';

class Provider {
  constructor(dictionary) {
    this.dictionary = dictionary;
    this.selector = '.source.java';
    this.disableForSelector = '.source.java .comment';
    this.inclusionPriority = 1;
    this.excludeLowerPriority = true;
  }

  setImportHandler(importHandler) {
    this.importHandler = importHandler;
  }

  getSuggestions({ editor, bufferPosition, scopeDescriptor, prefix, activatedManually }) {
    return this.dictionary
      .find(prefix)
      .slice(0, 10)
      .map(entry => ({
        text: denamespace(entry.name),
        rightLabel: packagify(entry.name),
        type: 'class',

        // Not part of autocomplete-api
        entry
      }));
  }

  onDidInsertSuggestion({ editor, triggerPosition, suggestion }) {
    if (!this.importHandler) {
      return;
    }

    this.importHandler(editor, suggestion.entry.name);
  }

  dispose() {
  }
}

export default Provider;
