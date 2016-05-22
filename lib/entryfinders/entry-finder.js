'use babel';

import { denamespace, packagify } from '../util';

class EntryFinder {
  IMPORT_REGEX = /import\s+([^;]+);/g;

  constructor(dictionary) {
    if (new.target === EntryFinder) {
      throw new TypeError('Can not directly create instance of EntryFinder');
    }

    if (this.get === EntryFinder.prototype.get) {
      throw new TypeError('Method `get` must be overriden by child');
    }

    this.dictionary = dictionary;
  }

  /**
   * Returns an array of all the imports in the specified editor.
   */
  getImports(editor) {
    const imports = [];
    editor.scan(this.IMPORT_REGEX, ({ match }) => imports.push(match[1]));
    return imports;
  }

  /**
   * Retrieves the fully qualified class by examining the imports
   * in the specified editor. For instance:
   * klass = `Arrays`
   * if import statements contain either `java.util.*;` or `java.util.Arrays`
   * then `java.util.Arrays` will be returned.
   */
  getFullyQualifiedClass(editor, klass) {
    const imports = this.getImports(editor);
    const importCandidates = imports.filter(imp => {
      return (denamespace(imp) === klass || denamespace(imp) === '*');
    });

    importCandidates.push('java.lang.*'); // Implicitly allowed in Java

    const existingImport = importCandidates.find(importCandidate =>
      this.dictionary.get(`${packagify(importCandidate)}.${klass}`)
    );

    return existingImport ? `${packagify(existingImport)}.${klass}` : null;
  }

  get() {
    throw new TypeError('Super `get` called from child.');
  }
}

export default { EntryFinder };
