'use babel';

import { EntryFinder } from './entry-finder';
import { packagify } from '../util';

class DotEntryFinder extends EntryFinder {

  constructor(dictionary) {
    super(dictionary);
  }

  staticMembers(fullyQualifiedClass, leaf) {
    let members = [];

    const filter = entry =>
      entry.modifiers.includes('public') && entry.modifiers.includes('static') &&
      (!leaf || entry.name.startsWith(leaf)); // If we have no leaf, match everything. Otherwise make sure it starts with `leaf`

    const classSuggestion = this.dictionary.get(fullyQualifiedClass);
    if (classSuggestion) {
      members = members.concat(classSuggestion.methods
        .filter(filter)
        .map(field => ({ ...field, _type: 'method' })));

      members = members.concat(classSuggestion.fields
        .filter(filter)
        .map(field => ({ ...field, _type: 'field' })));
    }

    return members;
  }

  nestedClass(fullyQualifiedClass, leaf) {
    const nestedClassSearch = `${fullyQualifiedClass}$${leaf || ''}`;
    const nestedClassSuggestions = this.dictionary.find(nestedClassSearch);
    if (nestedClassSuggestions) {
      return nestedClassSuggestions
        .filter(klass => -1 === klass.name.indexOf('$', nestedClassSearch.length)) // Remove any nested classes of the nested class
        .filter(klass => klass.modifiers.includes('public'))
        .map(klass => ({ ...klass, _type: 'class' }));
    }

    return [];
  }

  /**
   * Gets the suggestions when a dot is added to a prefix.
   *
   * `editor` is the current editor
   * `root` is the "path" to the class.
   * `leaf` is the last entry
   *
   * e.g. domain.vendor.Class would have
   *   - root = 'domain.vendor'
   *   - leaf = 'Class'
   */
  get(editor, pathToClass) {
    console.log(pathToClass);
    const fullyQualifiedRootClass = this.getFullyQualifiedClass(editor, pathToClass[0]);
    console.log(fullyQualifiedClass);
    if (null === fullyQualifiedRootClass) {
      return [];
    }

    const leaf = pathToClass[pathToClass.length - 1];
    console.log(leaf);
    const fullyQualifiedClass = `${packagify(fullyQualifiedRootClass)}.${pathToClass.slice(0, -1).join('$')}`;
    return [].concat(
      this.staticMembers(fullyQualifiedClass, leaf),
      this.nestedClass(fullyQualifiedClass, leaf)
    );
  }
}

export { DotEntryFinder };
