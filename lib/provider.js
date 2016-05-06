'use babel';

import { denamespace, packagify } from './util';

class Provider {
  IMPORT_REGEX = /import\s+([^;]+);/g;
  selector = '.source.java';
  disableForSelector = '.source.java .comment, .source.java .string';
  inclusionPriority = 1000;
  excludeLowerPriority = false;

  constructor(dictionary) {
    this.dictionary = dictionary;
  }

  setImportHandler(importHandler) {
    this.importHandler = importHandler;
  }

  /**
   * Returns an array of all the imports in the specified editor.
   */
  getImports(editor) {
    const imports = [];
    editor.scan(this.IMPORT_REGEX, ({ match }) => imports.push(match[1]));
    return imports;
  }

  /**
   * Finds the dot prefix.
   * `instance.prefix` will find `instance`.
   * `instance.` will find ``
   * `instance` will return null.
   */
  getDotPrefix(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    const match = lineText.match(/(\w+)\.\w*$/);
    return match ? match[1] : null;
  }

  /**
   * Retrieves the fully qualified class be examining the imports
   * in the specified editor. For instance:
   * klass = `Arrays`
   * if import statements at least hold `java.util.*;` or `java.util.Arrays`
   * then `java.util.Arrays` will be returned.
   */
  getFullyQualifiedClass(editor, klass) {
    const imports = this.getImports(editor);
    const importCandidates = imports.filter(imp => {
      return (denamespace(imp) === klass || denamespace(imp) === '*');
    });

    const existingImport = importCandidates.find(importCandidate =>
      this.dictionary.get(`${packagify(importCandidate)}.${klass}`)
    );

    return existingImport ? `${packagify(existingImport)}.${klass}` : null;
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
  getStaticClassDotPrefixedSuggestions(editor, dotPrefix, prefix) {
    const fullyQualifiedClass = this.getFullyQualifiedClass(editor, dotPrefix);
    if (null === fullyQualifiedClass) {
      return [];
    }

    return this.dictionary.get(fullyQualifiedClass).methods
      .filter(method =>
          method.modifiers.includes('public') &&
          method.modifiers.includes('static') &&
          (prefix === '.' || method.name.startsWith(prefix)));
  }

  getClassSuggestions(prefix) {
    return this.dictionary.find(prefix);
  }

  getSuggestions({ editor, bufferPosition, scopeDescriptor, prefix, activatedManually }) {
    let entries;
    let mapper;

    const dotPrefix = this.getDotPrefix(editor, bufferPosition);
    if (dotPrefix) {
      entries = this.getStaticClassDotPrefixedSuggestions(editor, dotPrefix, prefix);
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

      // Not part of autocomplete-api, passed so that the classname can be given to importHandler.
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
}

export default Provider;
