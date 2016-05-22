'use babel';

import { EntryFinder } from './entry-finder';

class DotEntryFinder extends EntryFinder {

  constructor(dictionary) {
    super(dictionary);
  }

  getDotChain(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    const match = lineText.match(/([^\s]+)$/);
    return match[1].split('.');
  }

  /**
   * Returns the return value (fullyQualifiedClass) from
   * `klass` with `name`. It can be the return value from
   * a method, or a field (in which case it's the storage type
   * of the field
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

  reduceDotChain(dotChain, editor, context = {}) {
    if (dotChain.length <= 1) {
      return context;
    }

    const next = () => this.reduceDotChain(dotChain.slice(1), editor, context);

    if (!context.fullyQualifiedClass) {
      // No class yes, this is first entry of chain and some guesswork is in order.
      context.fullyQualifiedClass = this.getFullyQualifiedClass(editor, dotChain[0]);
      context.static = true;
      return next();
    }

    if (context.static) {
      // May still be dot completing static classes, e.g. Response.Status
      // where Status is a nested class of Response
      const nestedClass = this.dictionary.get(`${context.fullyQualifiedClass}$${dotChain[0]}`);
      if (nestedClass) {
        context.fullyQualifiedClass = nestedClass.name;
        context.static = true;
        return next();
      }
    }

    // The first entry in the dotChain must be mapped to a new class.
    // That entry is a field in `context.fullyQualifiedClass`.
    const klass = this.dictionary.get(context.fullyQualifiedClass);
    if (!klass) {
      // This may be a primitive value, or fullyQualifiedClass is not in classpath
      return {};
    }

    context.fullyQualifiedClass = this.getMemberReturnValue(klass, dotChain[0]);
    context.static = false;

    return next();
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
    const dotChainEndContext = this.reduceDotChain(dotChain, editor);

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
