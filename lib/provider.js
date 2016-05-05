'use babel';

import { denamespace, packagify } from './util';

class Provider {
  constructor(dictionary) {
    this.IMPORT_REGEX = /import\s+([^;]+);/g;
    this.dictionary = dictionary;
    this.selector = '.source.java';
    this.disableForSelector = '.source.java .comment';
    this.inclusionPriority = 1;
    this.excludeLowerPriority = true;
  }

  setImportHandler(importHandler) {
    this.importHandler = importHandler;
  }

  getImports(editor) {
    const imports = [];
    editor.scan(this.IMPORT_REGEX, ({ match }) => imports.push(match[1]));
    return imports;
  }

  getClassSuggestions(prefix) {
    return this.dictionary.find(prefix);
  }

  getDotPrefix(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    const match = lineText.match(/(\w+)\.\w*$/);
    return match ? match[1] : null;
  }

  /**
   * Gets the suggestions when a dot is added to a prefix.
   * Example:
   *  - Row is: `myList.sort`
   *  - dotPrefix = myList
   *  - prefix = sort
   *
   * `editor` is the current editor
   */
  getDotPrefixedSuggestions(editor, dotPrefix, prefix) {
    const imports = this.getImports(editor);
    const importCandidates = imports.filter(imp => {
      return (denamespace(imp) === dotPrefix || denamespace(imp) === '*');
    });

    const existingImport = importCandidates.find(importCandidate =>
      this.dictionary.get(`${packagify(importCandidate)}.${dotPrefix}`)
    );

    if (!existingImport) {
      // Unable to determine which fully qualified class is referenced
      return [];
    }

    return this.dictionary.get(`${packagify(existingImport)}.${dotPrefix}`).methods
      .filter(method =>
          method.modifiers.includes('public') &&
          method.modifiers.includes('static') &&
          (prefix === '.' || method.name.startsWith(prefix)));
  }

  getSuggestions({ editor, bufferPosition, scopeDescriptor, prefix, activatedManually }) {
    let entries;
    let mapper;

    const dotPrefix = this.getDotPrefix(editor, bufferPosition);
    if (dotPrefix) {
      entries = this.getDotPrefixedSuggestions(editor, dotPrefix, prefix);
      mapper = this.mapMethodEntryToSuggestion;
    } else {
      entries = this.getClassSuggestions(prefix);
      mapper = this.mapClassEntryToSuggestion;
    }

    return entries
      .slice(0, 10)
      .map(mapper);
  }

  mapClassEntryToSuggestion(entry) {
    return {
      text: denamespace(entry.name),
      rightLabel: packagify(entry.name),
      type: 'class',

      // Not part of autocomplete-api
      entry
    };
  }

  mapMethodEntryToSuggestion(entry) {
    const args = entry.signature.arguments;
    const mapArg = (arg, index) => `\${${index + 1}:${arg}}`;
    return {
      snippet: `${entry.name}(${args.map(mapArg)})\$${args.length + 1}`,
      leftLabel: entry.signature.returnValue,
      type: 'method'
    };
  }

  onDidInsertSuggestion({ editor, triggerPosition, suggestion }) {
    if (!this.importHandler || suggestion.type !== 'class') {
      return;
    }

    this.importHandler(editor, suggestion.entry.name);
  }

  dispose() {
  }
}

export default Provider;
