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
    const match = lineText.match(/([\w.]+)\.(\w+)?$/);
    return match ? [ match[1], match[2] ] : null;
  }

  hasNewPrefix(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    return !!lineText.match(/new \w*$/);
  }

  /**
   * Retrieves the fully qualified class by examining the imports
   * in the specified editor. For instance:
   * klass = `Arrays`
   * if import statements contain either `java.util.*;` or `java.util.Arrays`
   * then `java.util.Arrays` will be returned.
   */
  getFullyQualifiedClass(editor, klass) {
    const imports = this.getImports(editor);
    const importCandidates = imports.filter(imp => {
      return (denamespace(imp) === klass || denamespace(imp) === '*');
    });

    importCandidates.push('java.lang.*'); // Implicitly allowed in Java

    const existingImport = importCandidates.find(importCandidate =>
      this.dictionary.get(`${packagify(importCandidate)}.${klass}`)
    );

    return existingImport ? `${packagify(existingImport)}.${klass}` : null;
  }

  /**
   * Gets the suggestions when a dot is added to a prefix.
   * Example:
   *  - Row is: `myList.sort`
   *
   * `editor` is the current editor
   *
   * `root` is the "path" to the class
   * `leaf` is the last entry
   * e.g. A.B.C would have
   *   - root = 'A.B'
   *   - leaf = 'C'
   */
  getDotPrefixedSuggestions(editor, [ root, leaf ], prefix) {
    const pathToClass = root.split('.');
    const fullyQualifiedRootClass = this.getFullyQualifiedClass(editor, pathToClass[0]);
    if (null === fullyQualifiedRootClass) {
      return [];
    }

    let methods = [];
    let fields = [];
    let classes = [];

    const fullyQualifiedClass = `${packagify(fullyQualifiedRootClass)}.${pathToClass.join('$')}`;
    const classSuggestion = this.dictionary.get(fullyQualifiedClass);
    if (classSuggestion) {
      methods = classSuggestion.methods
        .filter(method =>
          method.modifiers.includes('public') &&
          method.modifiers.includes('static') &&
          (prefix === '.' || method.name.startsWith(prefix)))
        .map(field => ({ ...field, _type: 'method' }));

      fields = classSuggestion.fields
        .filter(field =>
          field.modifiers.includes('public') &&
          field.modifiers.includes('static') &&
          (prefix === '.' || field.name.startsWith(prefix)))
        .map(field => ({ ...field, _type: 'field' }));
    }

    const nestedClassSearch = `${fullyQualifiedClass}$${leaf || ''}`;
    const nestedClassSuggestions = this.dictionary.find(nestedClassSearch, false);
    if (nestedClassSuggestions) {
      classes = nestedClassSuggestions
        .filter(klass => -1 === klass.name.indexOf('$', nestedClassSearch.length)) // Remove any nested classes of the nested class
        .filter(klass => klass.modifiers.includes('public'))
        .map(klass => ({ ...klass, _type: 'class' }));
    }

    return [].concat(methods, fields, classes);
  }

  getClassSuggestions(prefix) {
    return this.dictionary.find(prefix)
      .filter(klass => -1 === klass.name.indexOf('$', prefix.length)); // Remove any nested classes of the nested class
  }

  getPublicConstructorClassSuggestions(prefix) {
    return this.getClassSuggestions(prefix)
      .filter(entry => entry.methods.find(method => method.name === '<init>' && method.modifiers.includes('public')));
  }

  getSuggestions({ editor, bufferPosition, scopeDescriptor, prefix, activatedManually }) {
    if (!prefix || prefix.length === 0) {
      // Happens when typing e.g. `>`
      return [];
    }

    let entries;
    let mapper;

    const dotPrefix = this.getDotPrefix(editor, bufferPosition);
    const hasNewPrefix = this.hasNewPrefix(editor, bufferPosition);
    if (dotPrefix) {
      /**
       * Dot prefixed, e.g. `variable.prefix<cusor>`.
       * This should show members of the variable.
       * This needs to handle instance members too soon enough.
       */
      entries = this.getDotPrefixedSuggestions(editor, dotPrefix, prefix);
      mapper = this.mapClassOrMethodOrFieldToSuggestion;
    } else if (hasNewPrefix) {
      /**
       * Prefix is immediately preceded by the word `new`, eg. `new Prefix<cursor>`
       * This should return public constructors.
       */
      entries = this.getPublicConstructorClassSuggestions(prefix);
      mapper = this.mapClassEntryToConstructorSuggestion;
    } else {
      /**
       * The default case where a class is plainly typed out, e.g. `Prefix<cusor>
       */
      entries = this.getClassSuggestions(prefix);
      mapper = this.mapClassEntryToSuggestion;
    }

    return [].concat.apply([], entries
      .sort(this.sortByNameKey)
      .slice(0, 50) // More than 50 suggestions is just silly. Running `mapper` can be slow, thus this limit.
      .map(mapper.bind(this))
    );
  }

  methodEntryToSnippet(entry) {
    const args = entry.signature.arguments;
    const mapArg = (arg, index) => `\${${index + 1}:${arg}}`;
    return `${entry.name}(${args.map(mapArg).join(', ')})\$${args.length + 1}`;
  }

  mapClassOrMethodOrFieldToSuggestion(entry) {
    switch (entry._type) {
      case 'class': return this.mapClassEntryToSuggestion(entry);
      case 'method': return this.mapMethodEntryToSuggestion(entry);
      case 'field': return this.mapFieldEntryToSuggestion(entry);
      default:
        console.warn('Unknown map entry:', entry);
        return false;
    }
  }

  mapClassEntryToSuggestion(klass) {
    return {
      // The `text`/`snippet` thingie here is quite hacky. Snippet will be inserted into editor.
      // Setting `text` as the fully qualified class will make any duplicate class names,
      // but from different packages show up in suggestion list.
      // Issue: https://github.com/atom/autocomplete-plus/issues/615
      text: klass.name,
      snippet: denamespace(klass.name.replace(/\$/g, '.')),
      rightLabel: packagify(klass.name),
      type: 'class',

      // Not part of autocomplete-api, passed so that the classname can be given to importHandler.
      klass
    };
  }

  mapMethodEntryToSuggestion(method) {
    return {
      snippet: this.methodEntryToSnippet(method),
      leftLabel: method.signature.returnValue,
      type: 'method'
    };
  }

  mapFieldEntryToSuggestion(field) {
    return {
      text: field.name,
      leftLabel: field.type,
      type: 'constant'
    };
  }

  sortByNameKey(lhs, rhs) {
    return lhs.name.length - rhs.name.length;
  }

  mapClassEntryToConstructorSuggestion(klass) {
    const constructors = klass.methods.filter(method => method.name === '<init>');
    return constructors
      .map(constructor => ({
        snippet: this.methodEntryToSnippet({ ...constructor, name: denamespace(klass.name) }),
        rightLabel: packagify(klass.name),
        leftLabel: klass.name,
        type: 'class',

        // Not part of autocomplete-api, passed so that the classname can be given to importHandler.
        klass
      }));
  }

  onDidInsertSuggestion({ editor, triggerPosition, suggestion }) {
    if (!this.importHandler || suggestion.type !== 'class') {
      return;
    }

    this.importHandler(editor, suggestion.klass.name);
  }
}

export default Provider;
