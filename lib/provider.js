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
   * Checks if the current prefix is in a dot-chain.
   * e.g. `someClass.method().field`.
   *
   * It will *not* be true if only a plain entry is being input, e.g. `someClass`
   *
   */
  hasDotPrefix(editor, bufferPosition) {
    const lineText = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
    return !!lineText.match(/\.[^\s]*$/);
  }

  /**
   * Checks if the current prefix is preceded by the keyword `new`.
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

    const hasDotPrefix = this.hasDotPrefix(editor, bufferPosition);
    const hasNewPrefix = this.hasNewPrefix(editor, bufferPosition);
    if (hasDotPrefix) {
      /**
       * Dot prefixed, e.g. `something[.something].prefix<cusor>`.
       * This should show members of `something` (Nested classes, Static fields, etc).
       */
      entries = this.finders.dot.get(editor, bufferPosition, prefix);
    } else if (hasNewPrefix) {
      /**
       * Prefix is immediately preceded by the word `new`, eg. `new Prefix<cursor>`
       * This should return public constructors.
       */
      entries = this.finders.constructor.get(editor, bufferPosition, prefix);
    } else {
      /**
       * The default case where a class is plainly typed out, e.g. `Prefix<cursor>
       */
      entries = this.finders.plain.get(editor, bufferPosition, prefix);
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
