'use babel';

import { mapToSuggestion } from './mappers';
import { PlainEntryFinder, DotEntryFinder, ConstructorEntryFinder } from './entryfinders';
import { EditorTokens } from './editor-tokens';
import { denamespace } from './util';

class Provider {
  selector = '.source.java';
  disableForSelector = '.source.java .comment, .source.java .string';
  inclusionPriority = 1000;
  excludeLowerPriority = true;

  constructor() {
    this.editorTokens = new EditorTokens();
  }

  setImportHandler(importHandler) {
    this.importHandler = importHandler;
  }

  setRegistry(registry) {
    this.registry = registry;
    this.finders = {
      plain: new PlainEntryFinder(this.registry, this.editorTokens),
      dot: new DotEntryFinder(this.registry, this.editorTokens),
      constructor: new ConstructorEntryFinder(this.registry, this.editorTokens)
    };
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
    return !!lineText.match(/\.[^(\s]*$/);
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
    } else if (prefix) {
      /**
       * The default case where a class is plainly typed out, e.g. `Prefix<cursor>
       */
      entries = this.finders.plain.get(editor, bufferPosition, prefix);
    }

    return [].concat.apply([], entries
      .sort((lhs, rhs) => denamespace(lhs.name).length - denamespace(rhs.name).length) // Sort it by name length, so "closest" matches comes first
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
