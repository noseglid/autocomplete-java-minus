'use babel';

import { denamespace, packagify } from './util';

function methodEntryToSnippet(entry) {
  const args = entry.signature.arguments;
  const mapArg = (arg, index) => `\${${index + 1}:${arg}}`;
  return `${entry.name}(${args.map(mapArg).join(', ')})\$${args.length + 1}`;
}

function mapClassEntryToConstructorSuggestion(klass) {
  const constructors = klass.methods.filter(method => method.name === '<init>');
  return constructors
    .map(constructor => ({
      snippet: methodEntryToSnippet({ ...constructor, name: denamespace(klass.name) }),
      rightLabel: packagify(klass.name),
      leftLabel: klass.name,
      type: 'class',

      // Not part of autocomplete-api, passed so that the classname can be given to importHandler.
      klass
    }));
}

function mapClassEntryToSuggestion(klass) {
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

function mapMethodEntryToSuggestion(method) {
  return {
    snippet: methodEntryToSnippet(method),
    leftLabel: method.signature.returnValue,
    type: 'method'
  };
}

function mapFieldEntryToSuggestion(field) {
  return {
    text: field.name,
    leftLabel: field.type,
    type: 'constant'
  };
}

function mapToSuggestion(entry) {
  switch (entry._type) {
    case 'class': return mapClassEntryToSuggestion(entry);
    case 'method': return mapMethodEntryToSuggestion(entry);
    case 'field': return mapFieldEntryToSuggestion(entry);
    default:
      console.warn('Unknown map entry:', entry);
      return false;
  }
}

export { mapToSuggestion, mapClassEntryToConstructorSuggestion, mapClassEntryToSuggestion, mapMethodEntryToSuggestion, mapFieldEntryToSuggestion };
