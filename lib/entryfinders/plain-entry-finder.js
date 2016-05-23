'use babel';

import { denamespace } from '../util';
import { EntryFinder } from './entry-finder';

class PlainEntryFinder extends EntryFinder {

  constructor(dictionary) {
    super(dictionary);
  }

  getLocalFieldSuggestions(editor, prefix, tokens) {
    return this.getLocalFields(tokens, editor)
      .filter(entry => entry.name.startsWith(prefix))
      .map(({ type, name }) => ({
        name,
        type,
        _type: 'field',
        variable: true
      }));
  }

  getInheritedFieldSuggestions(prefix, superFullyQualifiedClass) {
    return this.getInheritedFields(superFullyQualifiedClass)
      .filter(entry => entry.name.startsWith(prefix))
      .map(field => ({
        ...field,
        variable: true,
        _type: 'field'
      }));
  }

  getClassSuggestions(prefix) {
    return this.dictionary.find(prefix, denamespace)
      .filter(klass => -1 === klass.name.indexOf('$', prefix.length)) // Remove any nested classes of the nested class
      .map(entry => ({ ...entry, _type: 'class' }));
  }

  get(editor, bufferPosition, prefix) {
    const tokens = this.getTokens(editor);
    const superClass = this.getSuperClass(tokens);
    const superFullyQualifiedClass = this.getFullyQualifiedClass(editor, superClass);

    return [].concat(
      this.getLocalFieldSuggestions(editor, prefix, tokens),
      this.getInheritedFieldSuggestions(prefix, superFullyQualifiedClass),
      this.getClassSuggestions(prefix)
    );
  }
}

export { PlainEntryFinder };

