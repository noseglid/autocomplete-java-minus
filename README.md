# autocomplete-java-minus

Autocomplete suggestions for Java.

## Getting started

**Create a file named `.classpath` in the project root.**

This file will be parsed an classes will be extracted from it and added
to autocomplete suggestions.

It should have the same format as the classpath
has on your platform. On UNIX it would look something like

```shell
/path/to/one/dependency.jar:/home/noseglid/devel/JavaProject/build/classes
```

`autocomplete-java-minus` will parse `dependency.jar` as well as any
class or JAR file under `/home/noseglid/devel/JavaProject/build/classes`

## Why not [autocomplete-java](https://atom.io/packages/autocomplete-java) ?

`autocomplete-java-minus` differs from `autocomplete-java` in that it:

  * uses [`jdjs`](http://npmjs.com/jdjs) to parse JARs/Classes. It's a native javascript implementation which is way faster, consumes less resources and offers more flexibility than spawning `javap` over and over again.
  * will only autocomplete. The limited scope will increase maintainability and quality.


## What will autocomplete-java-minus _not_ do ?

`autocomplete-java-minus` aims to only handle auto completion. Thus, the following will not be implemented in the scope of this package.

  * Work with import statements (although it does let [java-import-wiz](https://github.com/noseglid/java-import-wiz) know that an autocompletion was made so *it* can work with imports)
  * Dependency source code download or display
  * *go to* or *return from* declaration of any kind
  * Reconstruct source from `.class`-file

While these may be desired features, it is left up to other packages to implement.

## Add import statement after autocomplete

In java it is quite tedious to look up which package/namespace
a class belongs to. `autocomplete-java-minus` will work with
[java-import-wiz](https://github.com/noseglid/java-import-wiz)
to automatically insert `import` statements when an autocompletion is accepted.

## State of functionality

### Current features

  * Parse implicit Java JARs (`rt.jar`, `javaws.jar`, etc).
  * `.classpath` parsing:
    - JAR files
    - Class files
    - Folders (traversed for Class or Jar files)
  * Autocomplete suggestions for parsed classes
    - Classes (Interfaces, Annotations, etc are all classes)
    - Constructors with arguments and snippets
    - Static methods of classes with arguments and snippets
  * Autocomplete non-static members
    - Fields and members from instanced classes
    - Member fields from superclass
    - Local member fields
  * Integrated with [java-import-wiz](https://github.com/noseglid/java-import-wiz) for auto `import` statements.

### On the horizon

  * Autocomplete from the current project
    - This can in part be achieved by adding compiled `.class` or `.jar` to `.classpath` file. It will not react on new changes yet though.

