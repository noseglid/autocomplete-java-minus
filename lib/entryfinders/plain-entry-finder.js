'use babel';

import { denamespace } from '../util';
import { EntryFinder } from './entry-finder';

class PlainEntryFinder extends EntryFinder {

  constructor(registry) {
    super(registry);
  }

  getLocalFieldSuggestions(editor, bufferPosition, prefix, tokens) {
    return this.getClassLocalFields(tokens, editor).concat(this.getMethodLocalFields(tokens, editor, bufferPosition))
      .filter(entry => entry.name.startsWith(prefix))
      .map(({ type, name }) => ({
        name,
        type,
        _type: 'field',
        variable: true
      }));
  }

  getInheritedFieldSuggestions(prefix, superFullyQualifiedClass) {
    return this.getAllFields(superFullyQualifiedClass)
      .filter(entry => entry.name.startsWith(prefix))
      .map(field => ({
        ...field,
        variable: true,
        _type: 'field'
      }));
  }

  getLocalMethodSuggestions(editor, prefix, tokens) {
    return this.getLocalMethods(tokens, editor)
      .filter(method => method.name.startsWith(prefix))
      .map(method => ({ ...method, _type: 'method' }));
  }

  getInheritedMethodSuggestions(prefix, superFullyQualifiedClass) {
    return this.getAllMethods(superFullyQualifiedClass)
      .filter(method => method.name.startsWith(prefix))
      .map(method => ({ ...method, _type: 'method' }));
  }

  getClassSuggestions(prefix) {
    return this.registry.filter(fullyQualifiedClass => denamespace(fullyQualifiedClass).startsWith(prefix))
      .filter(klass => -1 === klass.name.indexOf('$', prefix.length)) // Remove any nested classes of the nested class
      .map(entry => ({ ...entry, _type: 'class' }));
  }

  get(editor, bufferPosition, prefix) {
    const tokens = this.getTokens(editor);
    const superClass = this.getSuperClass(tokens);
    const superFullyQualifiedClass = this.getFullyQualifiedClass(editor, superClass);

    return [].concat(
      this.getLocalFieldSuggestions(editor, bufferPosition, prefix, tokens),
      this.getInheritedFieldSuggestions(prefix, superFullyQualifiedClass),
      this.getLocalMethodSuggestions(editor, prefix, tokens),
      this.getInheritedMethodSuggestions(prefix, superFullyQualifiedClass),
      this.getClassSuggestions(prefix)
    );
  }
}

export { PlainEntryFinder };

