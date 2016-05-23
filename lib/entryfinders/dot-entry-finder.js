'use babel';

import { EntryFinder } from './entry-finder';

class DotEntryFinder extends EntryFinder {

  constructor(dictionary) {
    super(dictionary);
  }

  parseDotChain(code) {
    const parts = [];

    let parensDepth = 0;
    let quoted = false;
    let current = '';
    for (const char of code) {
      current += char;
      switch (char) {
        case '"':
          if (current[current.length - 2] !== '\\') quoted = !quoted;
          break;
        case '(':
          if (!quoted) parensDepth++;
          break;

        case ')':
          if (!quoted) parensDepth--;
          break;

        case '.':
          if (parensDepth === 0 && !quoted) {
            parts.push(current.slice(0, -1)); // Skip the dot
            current = '';
          }
          break;
      }
    }
    parts.push(current);

    return parts;
  }

  getDotChain(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    return this.parseDotChain(lineText.trim());
  }

  /**
   * Returns the return value (fully qualified) from
   * `klass` with `name`. It can be the return value from
   * a method, or a field (in which case it's the storage type
   * of the field).
   * Will return null if that name does not exist on klass.
   */
  getMemberReturnValue(klass, name) {
    const plainName = name.match(/^([^\(]*).*$/)[1];
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
        return {
          fullyQualifiedClass: this.getFullyQualifiedClass(editor, entry),
          static: true
        };
      }

      if (state.static) {
        // May still be completing static classes, e.g. Response.Status
        // where Status is a nested class of Response. Nested classes are separated by
        // a dollar ($) rather than a dot (.) in `dictionary`.
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

    const klass = this.dictionary.get(dotChainEndContext.fullyQualifiedClass);
    if (!klass) {
      return [];
    }

    const entryFilter = entry =>
      entry.modifiers.includes('public') &&
      entry.modifiers.includes('static') === dotChainEndContext.static &&
      entry.name !== '<init>' && // Do not include constructors if this is a method
      (prefix === '.' || entry.name.startsWith(prefix));

    const fieldSuggestions = klass.fields
      .filter(entryFilter)
      .map(field => ({ ...field, _type: 'field' }));

    const methodSuggestions = klass.methods
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
