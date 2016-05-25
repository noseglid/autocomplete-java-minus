'use babel';

import { EntryFinder } from './entry-finder';
import { nameify, extractDotChain, parseDotChain } from '../util';

class DotEntryFinder extends EntryFinder {

  constructor(dictionary) {
    super(dictionary);
  }

  getDotChain(editor, bufferPosition) {
    const textToBufferPosition = editor.getTextInRange([[0, 0], bufferPosition]);
    const dotChain = extractDotChain(textToBufferPosition);
    return parseDotChain(dotChain);
  }

  /**
   * Returns the return value (fully qualified) from
   * `klass` with `name`. It can be the return value from
   * a method, or a field (in which case it's the storage type
   * of the field).
   * Will return null if that name does not exist on klass.
   */
  getMemberReturnValue(klass, name) {
    const plainName = nameify(name);
    const fieldMember = klass.fields.find(field => field.name === plainName);
    if (fieldMember) {
      return fieldMember.type;
    }

    const methodMember = klass.methods.find(method => method.name === plainName);
    if (methodMember) {
      return methodMember.signature.returnValue;
    }

    return null;
  }

  reduceDotChain(editor) {
    return (state, entry, index, array) => {
      if (index === array.length - 1) {
        // The "last" entry in array is current candidate for completion
        // It is likely not be complete, do not reduce it.
        return state;
      }

      if (!state.fullyQualifiedClass) {
        // No class in the state yet.
        // This is first entry of chain and some guesswork is in order.
        return this.guessType(editor, entry);
      }

      if (state.static) {
        // May still be completing static classes, e.g. Response.Status
        // where Status is a nested class of Response. Nested classes are separated by
        // a dollar ($) rather than a dot (.) in the dictionary.
        const nestedClass = this.dictionary.get(`${state.fullyQualifiedClass}$${entry}`);
        if (nestedClass) {
          return {
            fullyQualifiedClass: nestedClass.name,
            static: true
          };
        }
      }

      const klass = this.dictionary.get(state.fullyQualifiedClass);
      if (!klass) {
        // This may be a primitive value, or fullyQualifiedClass is not in classpath
        return {};
      }

      return {
        fullyQualifiedClass: this.getMemberReturnValue(klass, entry),
        static: false
      };
    };
  }

  getNestedClasses(fullyQualifiedClass, prefix) {
    const nestedClassSearch = `${fullyQualifiedClass}$${prefix || ''}`;
    const nestedClassSuggestions = this.dictionary.find(nestedClassSearch);
    if (nestedClassSuggestions) {
      return nestedClassSuggestions
        .filter(klass =>
          -1 === klass.name.indexOf('$', nestedClassSearch.length) && // Remove any nested classes of the nested class
          klass.modifiers.includes('public')
        )
        .map(klass => ({ ...klass, _type: 'class' }));
    }

    return [];
  }

  get(editor, bufferPosition, prefix) {
    const dotChain = this.getDotChain(editor, bufferPosition);
    const dotChainEndContext = dotChain.reduce(this.reduceDotChain(editor), {});

    const entryFilter = entry =>
      entry.modifiers.includes('public') &&
      entry.modifiers.includes('static') === dotChainEndContext.static &&
      entry.name !== '<init>' && // Do not include constructors if this is a method
      (prefix === '.' || entry.name.startsWith(prefix));

    const fieldSuggestions = this.getAllFields(dotChainEndContext.fullyQualifiedClass)
      .filter(entryFilter)
      .map(field => ({ ...field, _type: 'field' }));

    const methodSuggestions = this.getAllMethods(dotChainEndContext.fullyQualifiedClass)
      .filter(entryFilter)
      .map(method => ({ ...method, _type: 'method' }));

    let classSuggestions = [];
    if (dotChainEndContext.static) {
      // Since we're in a static context, there may be nested classes
      classSuggestions = this.getNestedClasses(dotChainEndContext.fullyQualifiedClass, prefix);
    }

    return [].concat(
      fieldSuggestions,
      methodSuggestions,
      classSuggestions
    );
  }
}

export { DotEntryFinder };
