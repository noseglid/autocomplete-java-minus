'use babel';

import { denamespace, packagify, nameify } from '../util';
import { getLocalMethods } from './local-methods';
import { getClassLocalFields } from './class-local-fields';
import { getMethodLocalFields } from './method-local-fields';

class EntryFinder {
  IMPORT_REGEX = /import\s+([^;]+);/g;

  constructor(registry) {
    if (new.target === EntryFinder) {
      throw new TypeError('Can not directly create instance of EntryFinder');
    }

    if (this.get === EntryFinder.prototype.get) {
      throw new TypeError('Method `get` must be overriden by child');
    }

    this.registry = registry;
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
   * Precedence
   *   1. Constructors
   *   2. Local fields
   *   3. Local methods
   *   4. Inherited fields
   *   5. Inherited methods
   *   6. Imported static classes
   */
  guessType(editor, token, bufferPosition) {
    const tokens = this.getTokens(editor);
    const findByToken = member => member.name === nameify(token);

    const newMatch = token.match(/^new ([\w$]+)/);
    if (newMatch) {
      const klass = newMatch[1];
      return {
        fullyQualifiedClass: this.getFullyQualifiedClass(editor, klass) || klass,
        static: false
      };
    }

    const classLocalField = this.getClassLocalFields(tokens, editor).find(findByToken);
    if (classLocalField) {
      return { fullyQualifiedClass: classLocalField.type, static: false };
    }

    const methodLocalField = this.getMethodLocalFields(tokens, editor, bufferPosition).find(findByToken);
    if (methodLocalField) {
      return { fullyQualifiedClass: methodLocalField.type, static: false };
    }

    const localMethod = this.getLocalMethods(tokens, editor).find(findByToken);
    if (localMethod) {
      return { fullyQualifiedClass: localMethod.signature.returnValue, static: false };
    }

    const superClass = this.getSuperClass(tokens);
    const superFullyQualifiedClass = this.getFullyQualifiedClass(editor, superClass);

    const inheritedField = this.getAllFields(superFullyQualifiedClass).find(findByToken);
    if (inheritedField) {
      return { fullyQualifiedClass: inheritedField.type, static: false };
    }

    const inheritedMethod = this.getAllMethods(superFullyQualifiedClass).find(findByToken);
    if (inheritedMethod) {
      return { fullyQualifiedClass: inheritedMethod.signature.returnValue, static: false };
    }

    return { fullyQualifiedClass: this.getFullyQualifiedClass(editor, token), static: true };
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
      this.registry.get(`${packagify(importCandidate)}.${klass}`)
    );

    return existingImport ? `${packagify(existingImport)}.${klass}` : null;
  }

  getAllFields(fullyQualifiedClass) {
    const klass = this.registry.get(fullyQualifiedClass);
    if (!klass) {
      return [];
    }
    const fields = klass.fields
      .filter(field => field.modifiers.includes('public') || field.modifiers.includes('protected'))
      .map(field => ({ ...field, origin: fullyQualifiedClass }));

    return fields.concat(this.getAllFields(klass.super));
  }

  getAllMethods(fullyQualifiedClass) {
    const klass = this.registry.get(fullyQualifiedClass);
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

EntryFinder.prototype.getLocalMethods = getLocalMethods;
EntryFinder.prototype.getClassLocalFields = getClassLocalFields;
EntryFinder.prototype.getMethodLocalFields = getMethodLocalFields;

export default { EntryFinder };
