'use babel';

import { denamespace, packagify } from './util';
import { mapToSuggestion } from './mappers';

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
   *
   * 'instance.nested.prefix' will find [ 'instance.nested', 'prefix' ]
   * 'instance.prefix' will find [ 'instance', 'prefix' ]
   * 'instance.' will find [ 'instance', undefined ]
   * 'instance' will return null.
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

  getDotPrefixedStaticMembers(fullyQualifiedClass, leaf) {
    let members = [];

    const filter = entry =>
      entry.modifiers.includes('public') && entry.modifiers.includes('static') &&
      (!leaf || entry.name.startsWith(leaf)); // If we have no leaf, match everything. Otherwise make sure it starts with `leaf`

    const classSuggestion = this.dictionary.get(fullyQualifiedClass);
    if (classSuggestion) {
      members = members.concat(classSuggestion.methods
        .filter(filter)
        .map(field => ({ ...field, _type: 'method' })));

      members = members.concat(classSuggestion.fields
        .filter(filter)
        .map(field => ({ ...field, _type: 'field' })));
    }

    return members;
  }

  getDotPrefixedNestedClasses(fullyQualifiedClass, leaf) {
    const nestedClassSearch = `${fullyQualifiedClass}$${leaf || ''}`;
    const nestedClassSuggestions = this.dictionary.find(nestedClassSearch);
    if (nestedClassSuggestions) {
      return nestedClassSuggestions
        .filter(klass => -1 === klass.name.indexOf('$', nestedClassSearch.length)) // Remove any nested classes of the nested class
        .filter(klass => klass.modifiers.includes('public'))
        .map(klass => ({ ...klass, _type: 'class' }));
    }

    return [];
  }

  /**
   * Gets the suggestions when a dot is added to a prefix.
   * Example:
   *  - Row is: `myList.sort`
   *
   * `editor` is the current editor
   * `root` is the "path" to the class
   * `leaf` is the last entry
   * e.g. A.B.C would have
   *   - root = 'A.B'
   *   - leaf = 'C'
   */
  getDotPrefixedSuggestions(editor, [ root, leaf ]) {
    const pathToClass = root.split('.');
    const fullyQualifiedRootClass = this.getFullyQualifiedClass(editor, pathToClass[0]);
    if (null === fullyQualifiedRootClass) {
      return [];
    }

    const fullyQualifiedClass = `${packagify(fullyQualifiedRootClass)}.${pathToClass.join('$')}`;
    return [].concat(
      this.getDotPrefixedStaticMembers(fullyQualifiedClass, leaf),
      this.getDotPrefixedNestedClasses(fullyQualifiedClass, leaf)
    );
  }

  getPublicConstructorClassSuggestions(prefix) {
    return this.getClassSuggestions(prefix)
      .filter(entry => entry.methods.find(method => method.name === '<init>' && method.modifiers.includes('public')))
      .map(entry => ({ ...entry, _type: 'constructor' }));
  }

  getClassSuggestions(prefix) {
    return this.dictionary.find(prefix, denamespace)
      .filter(klass => -1 === klass.name.indexOf('$', prefix.length)) // Remove any nested classes of the nested class
      .map(entry => ({ ...entry, _type: 'class' }));
  }

  getLocalFields(tokens) {
    return tokens
      .map(row => row.filter(token =>
        token.scopes.includes('meta.definition.variable.java') &&
        (
          token.scopes.includes('storage.type.java') ||
          token.scopes.includes('storage.type.primitive.java') ||
          token.scopes.includes('meta.definition.variable.name.java')
        )
      ))
      .filter(row => row.length >= 2) // Storage type and variable name
      .map(([ { value: type }, { value: name } ]) => ({ type, name }));
  }

  getLocalFieldSuggestions(editor, prefix, tokens) {
    return this.getLocalFields(tokens)
      .filter(entry => entry.name.startsWith(prefix))
      .map(({ type, name }) => ({
        name,
        type: this.getFullyQualifiedClass(editor, type),
        _type: 'field',
        variable: true
      }));
  }

  getInheritedFieldSuggestions(prefix, inheritedFullyQualifiedClass) {
    const klass = this.dictionary.get(inheritedFullyQualifiedClass);
    if (!klass) {
      return [];
    }

    const suggestions = klass.fields
      .filter(field => field.modifiers.includes('public') || field.modifiers.includes('protected'))
      .map(field => ({
        ...field,
        variable: true,
        origin: inheritedFullyQualifiedClass,
        _type: 'field' }));

    let superSuggestions = [];
    if (klass.super) {
      superSuggestions = this.getInheritedFieldSuggestions(prefix, klass.super);
    }

    return suggestions.concat(superSuggestions);
  }

  getPlainSuggestions(editor, prefix) {
    const grammar = atom.grammars.grammarForScopeName('source.java');
    const tokens = grammar.tokenizeLines(editor.getText());

    const superToken = [].concat.apply([], tokens)
      .find(token =>
        token.scopes.includes('entity.other.inherited-class.java')
      );

    const inheritedClass = this.getFullyQualifiedClass(editor, superToken ? superToken.value : 'Object');

    return [].concat(
      this.getLocalFieldSuggestions(editor, prefix, tokens),
      this.getInheritedFieldSuggestions(prefix, inheritedClass),
      this.getClassSuggestions(prefix)
    );
  }

  getSuggestions({ editor, bufferPosition, scopeDescriptor, prefix, activatedManually }) {
    if (!prefix || prefix.length === 0) {
      // Happens when typing e.g. `>`
      return [];
    }

    let entries = [];

    const dotPrefix = this.getDotPrefix(editor, bufferPosition);
    const hasNewPrefix = this.hasNewPrefix(editor, bufferPosition);
    if (dotPrefix) {
      /**
       * Dot prefixed, e.g. `something[.something].prefix<cusor>`.
       * This should show members of `something` (Nested classes, Static fields, etc).
       * This needs to handle instance members too soon enough.
       */
      entries = this.getDotPrefixedSuggestions(editor, dotPrefix);
    } else if (hasNewPrefix) {
      /**
       * Prefix is immediately preceded by the word `new`, eg. `new Prefix<cursor>`
       * This should return public constructors.
       */
      entries = this.getPublicConstructorClassSuggestions(prefix);
    } else {
      /**
       * The default case where a class is plainly typed out, e.g. `Prefix<cusor>
       */
      entries = this.getPlainSuggestions(editor, prefix);
    }

    return [].concat.apply([], entries
      .sort((lhs, rhs) => lhs.name.length - rhs.name.length) // Sort it by name length, so "closest" matches comes first
      .slice(0, 50) // More than 50 suggestions is just silly. Running `mapper` can be slow, thus this limit.
      .map(mapToSuggestion)
    );
  }

  onDidInsertSuggestion({ editor, triggerPosition, suggestion }) {
    if (!this.importHandler || suggestion.type !== 'class') {
      return;
    }

    this.importHandler(editor, suggestion.klass.name);
  }
}

export default Provider;
