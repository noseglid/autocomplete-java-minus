# autocomplete-java-minus

Autocomplete suggestions for Java projects.

## Getting started

Create a file named `.classpath` in the project root. This file
will be parsed an classes will be extracted from it and added
to autocomplete suggestions.

## Why not [autocomplete-java](https://atom.io/packages/autocomplete-java) ?

autocomplete-java-minus differes from `autocomplete-java` in:

  * Uses [`jdjs`](http://npmjs.com/jdjs) to parse Class-files. It's a native javascript implementation which is way faster, consumes less resources and offers more flexibility than spawning `javap` over and over again.
  * Will only autocomplete. The limited scope will increase maintainability and quality.

## Add import statement after autocomplete

If you want `import` statements to be inserted after an autocomplete,
have a look at [java-import-wiz](https://github.com/noseglid/java-import-wiz).

`java-import-wiz` works together with `autocomplete-java-minus`.

## Support

### Current features

  * `.classpath` parsing:
    - JAR files
  * Autocomplete suggestions for parsed classes

### Upcomming features

  * `rt.jar` parsing (Java Built in classes)
  * `.classpath` parsing:
    - Class files
    - Folders (which will be traversed for class or jar files)

### On the horizon

  * Autocomplete methods with snippets

