'use babel';

import { denamespace } from '../util';
import { EntryFinder } from './entry-finder';

class PlainEntryFinder extends EntryFinder {

  constructor(dictionary) {
    super(dictionary);
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
      .filter(entry => entry.name.startsWith(prefix))
      .map(field => ({
        ...field,
        variable: true,
        origin: inheritedFullyQualifiedClass,
        _type: 'field'
      }));

    let superSuggestions = [];
    if (klass.super) {
      superSuggestions = this.getInheritedFieldSuggestions(prefix, klass.super);
    }

    return suggestions.concat(superSuggestions);
  }

  getClassSuggestions(prefix) {
    return this.dictionary.find(prefix, denamespace)
      .filter(klass => -1 === klass.name.indexOf('$', prefix.length)) // Remove any nested classes of the nested class
      .map(entry => ({ ...entry, _type: 'class' }));
  }

  get(editor, prefix) {
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
}

export { PlainEntryFinder };

