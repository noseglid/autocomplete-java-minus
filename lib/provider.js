'use babel';

import { mapToSuggestion } from './mappers';
import { PlainEntryFinder, DotEntryFinder, ConstructorEntryFinder } from './entryfinders';

class Provider {
  selector = '.source.java';
  disableForSelector = '.source.java .comment, .source.java .string';
  inclusionPriority = 1000;
  excludeLowerPriority = false;

  constructor(dictionary) {
    this.dictionary = dictionary;
    this.finders = {
      plain: new PlainEntryFinder(this.dictionary),
      dot: new DotEntryFinder(this.dictionary),
      constructor: new ConstructorEntryFinder(this.dictionary)
    };
  }

  setImportHandler(importHandler) {
    this.importHandler = importHandler;
  }

  /**
   * Finds the dot prefix, if any.
   *
   * 'instance.nested.prefix' will find [ 'instance', 'nested', 'prefix' ]
   * 'instance.prefix' will find [ 'instance', 'prefix' ]
   * 'instance.' will find [ 'instance', undefined ]
   * 'instance' will return null.
   */
  getDotPrefix(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    const match = lineText.match(/([\w.]+)\.(\w+)?$/);
    return match ? match[1].split('.').concat(match[2]) : null;
  }

  /**
   * Checks if the current prefix his followed by the keyword `new`.
   *
   * The new prefix will be the word typed after the keyword `new`.
   * For example, typing; `new Class` would return true.
   */
  hasNewPrefix(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    return !!lineText.match(/new \w*$/);
  }

  getSuggestions({ editor, bufferPosition, scopeDescriptor, prefix, activatedManually }) {
    if (!prefix || prefix.length === 0) {
      // Happens when typing e.g. `>`
      return [];
    }

    let entries = [];

    const dotPrefix = this.getDotPrefix(editor, bufferPosition);
    const hasNewPrefix = this.hasNewPrefix(editor, bufferPosition);
    if (dotPrefix) {
      /**
       * Dot prefixed, e.g. `something[.something].prefix<cusor>`.
       * This should show members of `something` (Nested classes, Static fields, etc).
       * This needs to handle instance members too soon enough.
       */
      entries = this.finders.dot.get(editor, dotPrefix);
    } else if (hasNewPrefix) {
      /**
       * Prefix is immediately preceded by the word `new`, eg. `new Prefix<cursor>`
       * This should return public constructors.
       */
      entries = this.finders.constructor.get(prefix);
    } else {
      /**
       * The default case where a class is plainly typed out, e.g. `Prefix<cursor>
       */
      entries = this.finders.plain.get(editor, prefix);
    }

    return [].concat.apply([], entries
      .sort((lhs, rhs) => lhs.name.length - rhs.name.length) // Sort it by name length, so "closest" matches comes first
      .slice(0, 50) // More than 50 suggestions is just silly. Running `mapper` can be slow, thus this limit.
      .map(mapToSuggestion)
    );
  }

  onDidInsertSuggestion({ editor, triggerPosition, suggestion }) {
    if (!this.importHandler || suggestion.type !== 'class') {
      return;
    }

    this.importHandler(editor, suggestion.klass.name);
  }
}

export default Provider;
