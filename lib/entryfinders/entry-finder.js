'use babel';

import { denamespace, packagify, nameify } from '../util';

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
   *   3. Inherited methods
   *   4. Imported static classes
   */
  guessType(editor, token) {
    const tokens = this.getTokens(editor);
    const tokenName = nameify(token);

    const localMember = this.getLocalFields(tokens, editor).find(member => member.name === tokenName);
    if (localMember) {
      return {
        fullyQualifiedClass: localMember.type,
        static: false
      };
    }

    const superClass = this.getSuperClass(tokens);
    const superFullyQualifiedClass = this.getFullyQualifiedClass(editor, superClass);

    const inheritedField = this.getAllFields(superFullyQualifiedClass).find(field => field.name === tokenName);
    if (inheritedField) {
      return {
        fullyQualifiedClass: inheritedField.type,
        static: false
      };
    }

    const inheritedMethod = this.getAllMethods(superFullyQualifiedClass).find(method => method.name === tokenName);
    console.log('found inheritedMethod:', inheritedMethod);
    if (inheritedMethod) {
      return {
        fullyQualifiedClass: inheritedMethod.signature.returnValue,
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

  getAllFields(fullyQualifiedClass) {
    const klass = this.dictionary.get(fullyQualifiedClass);
    if (!klass) {
      return [];
    }
    const fields = klass.fields
      .filter(field => field.modifiers.includes('public') || field.modifiers.includes('protected'))
      .map(field => ({ ...field, origin: fullyQualifiedClass }));

    return fields.concat(this.getAllFields(klass.super));
  }

  getLocalFields(tokens, editor) {
    return tokens
      .map(row => row.filter(token =>
        token.scopes.includes('meta.definition.variable.java') &&
        (
          token.scopes.includes('storage.type.java') ||
          token.scopes.includes('storage.type.primitive.java') ||
          token.scopes.includes('meta.definition.variable.name.java') ||
          token.scopes.includes('constant.variable.java')
        )
      ))
      .filter(row => row.length >= 2) // Storage type and variable name
      .map(([ { value: type }, { value: name } ]) => ({
        type: this.getFullyQualifiedClass(editor, type) || type,
        name
      }));
  }

  getLocalMethods(tokens, editor) {
    return tokens
      .map(row => row.filter(token =>
        token.scopes.includes('meta.method.java') &&
        (
          token.scopes.includes('meta.method.return-type.java') ||
          token.scopes.includes('entity.name.function.java')
        )
      ))
      .filter(row => row.length >= 2) // Return type and method name
      .map(([ { value: type }, { value: name } ]) => ({
        type: this.getFullyQualifiedClass(editor, type) || type,
        name
      }));
  }

  getAllMethods(fullyQualifiedClass) {
    const klass = this.dictionary.get(fullyQualifiedClass);
    if (!klass) {
      return [];
    }

    const methods = klass.methods
      .filter(method => method.modifiers.includes('public') || method.modifiers.includes('protected'))
      .map(method => ({ ...method, origin: fullyQualifiedClass }));

    return methods.concat(this.getAllMethods(klass.super));
  }

  get(editor, bufferPosition, prefix) {
    throw new TypeError('Super `get` called from child.');
  }
}

export default { EntryFinder };
