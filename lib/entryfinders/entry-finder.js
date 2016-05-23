'use babel';

import { denamespace, packagify } from '../util';

class EntryFinder {
  IMPORT_REGEX = /import\s+([^;]+);/g;

  constructor(dictionary) {
    if (new.target === EntryFinder) {
      throw new TypeError('Can not directly create instance of EntryFinder');
    }

    if (this.get === EntryFinder.prototype.get) {
      throw new TypeError('Method `get` must be overriden by child');
    }

    this.dictionary = dictionary;
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
   * Returns an array of tokens as specified by the grammar for 'source.java'.
   */
  getTokens(editor) {
    const grammar = atom.grammars.grammarForScopeName('source.java');
    return grammar.tokenizeLines(editor.getText());
  }

  getSuperClass(tokens) {
    const superToken = [].concat.apply([], tokens).find(token =>
      token.scopes.includes('entity.other.inherited-class.java')
    );

    return superToken ? superToken.value : 'Object';
  }

  /**
   * Guess the type of the unqualified token in the editor.
   * It will test multiple things it may be and the first
   * hit will return an object { fullyQualifiedClass, static }.
   *
   * Precedence is
   *   1. Local fields
   *   2. Inherited fields
   *   3. Imported static classes
   */
  guessType(editor, token) {
    const tokens = this.getTokens(editor);

    const localMember = this.getLocalFields(tokens, editor).find(member => member.name === token);
    if (localMember) {
      return {
        fullyQualifiedClass: localMember.type,
        static: false
      };
    }

    const superClass = this.getSuperClass(tokens);
    const superFullyQualifiedClass = this.getFullyQualifiedClass(editor, superClass);
    const inheritedMember = this.getInheritedFields(superFullyQualifiedClass).find(member => member.name === token);
    if (inheritedMember) {
      return {
        fullyQualifiedClass: inheritedMember.type,
        static: false
      };
    }

    return {
      fullyQualifiedClass: this.getFullyQualifiedClass(editor, token),
      static: true
    };
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

  getLocalFields(tokens, editor) {
    return tokens
      .map(row => row.filter(token =>
        token.scopes.includes('meta.definition.variable.java') &&
        (
          token.scopes.includes('storage.type.java') ||
          token.scopes.includes('storage.type.primitive.java') ||
          token.scopes.includes('meta.definition.variable.java') && (
            token.scopes.includes('meta.definition.variable.name.java') ||
            token.scopes.includes('constant.variable.java')
          )
        )
      ))
      .filter(row => row.length >= 2) // Storage type and variable name
      .map(([ { value: type }, { value: name } ]) => ({
        type: this.getFullyQualifiedClass(editor, type),
        name
      }));
  }

  getInheritedFields(fullyQualifiedClass) {
    const klass = this.dictionary.get(fullyQualifiedClass);
    if (!klass) {
      return [];
    }
    const fields = klass.fields
      .filter(field => field.modifiers.includes('public') || field.modifiers.includes('protected'))
      .map(field => ({ ...field, origin: fullyQualifiedClass }));

    let superFields = [];
    if (klass.super) {
      superFields = this.getInheritedFields(klass.super);
    }

    return fields.concat(superFields);
  }

  get(editor, bufferPosition, prefix) {
    throw new TypeError('Super `get` called from child.');
  }
}

export default { EntryFinder };
