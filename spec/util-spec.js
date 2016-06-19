'use babel';

import { extractDotChain, parseDotChain } from '../lib/util';

describe('Util', () => {
  describe('extractDotChain', () => {
    it('should extract plain variables when there are spaces to previous token', () => {
      expect(extractDotChain('return variable'))
        .toEqual('variable');
    });

    it('should extract members of plain variables when there are spaces to previous token', () => {
      expect(extractDotChain('return variable.method'))
        .toEqual('variable.method');
    });

    it('should extract plain method calls when there are spaces to previous token', () => {
      expect(extractDotChain('return someMethod()'))
        .toEqual('someMethod()');
    });

    it('should extract member method calls when there are spaces to previous token', () => {
      expect(extractDotChain('return variable.method()'))
        .toEqual('variable.method()');
    });

    it('should extract methods with quoted arguments', () => {
      expect(extractDotChain('return variable.method("string")'))
        .toEqual('variable.method("string")');
    });

    it('should extract methods with dotted arguments', () => {
      expect(extractDotChain('return variable.method(Domain.Namespace.Class.method())'))
        .toEqual('variable.method(Domain.Namespace.Class.method())');
    });

    it('should extract when there are newlines', () => {
      expect(extractDotChain('return\nvariable\n.method("string",\nAnother.arg.methodCall())'))
        .toEqual('variable.method("string",Another.arg.methodCall())');
    });

    it('should extract with multiple whitespaces combined', () => {
      expect(extractDotChain('variable\n.argument.\nother\n\n\n\n       . deep'))
        .toEqual('variable.argument.other.deep');
    });

    it('should extract when there\'s very compact code', () => {
      expect(extractDotChain('int a=5;variable.methodCall().otherThing'))
        .toEqual('variable.methodCall().otherThing');
    });

    it('should extract the first statement of a method', () => {
      expect(extractDotChain('public void m(Root.Class somearg) {\n return someVariable.result()'))
        .toEqual('someVariable.result()');
    });

    it('should extract the first statement of a method even if very compact code', () => {
      expect(extractDotChain('public void method(){somevariable.method()'))
        .toEqual('somevariable.method()');
    });

    it('should extract nested completions', () => {
      expect(extractDotChain('someMethodCall(Root.completion.other("args")'))
        .toEqual('Root.completion.other("args")');
    });

    it('should ignore escaped quotes in quotes', () => {
      expect(extractDotChain('var.someMethodCall(" \\"quote me\\" ")'))
        .toEqual('var.someMethodCall(" \\"quote me\\" ")');
    });

    it('should extract keyword new and constructor', () => {
      expect(extractDotChain('new Constructor("some argument").someMethod()'))
        .toEqual('new Constructor("some argument").someMethod()');
    });
  });

  describe('parseDotChain', () => {
    it('should split on dots between static classes', () => {
      expect(parseDotChain('Root.Class.NestedClass'))
        .toEqual([ 'Root', 'Class', 'NestedClass' ]);
    });

    it('should parse an empty string if code ends with a dot', () => {
      expect(parseDotChain('Root.'))
        .toEqual([ 'Root', '' ]);
    });

    it('should work with no-args method calls', () => {
      expect(parseDotChain('Root.method().Class'))
        .toEqual([ 'Root', 'method()', 'Class' ]);
    });

    it('should work with arguments in method calls', () => {
      expect(parseDotChain('Root.method(someArgument).Class'))
        .toEqual([ 'Root', 'method(someArgument)', 'Class' ]);

      expect(parseDotChain('Root.method(arg1, arg2).Class'))
        .toEqual([ 'Root', 'method(arg1, arg2)', 'Class' ]);
    });

    it('should work with quoted arguments', () => {
      expect(parseDotChain('Root.method("this arg").Class'))
        .toEqual([ 'Root', 'method("this arg")', 'Class' ]);

      expect(parseDotChain('Root.method("this.arg").Class'))
        .toEqual([ 'Root', 'method("this.arg")', 'Class' ]);

      expect(parseDotChain('Root.method("this.arg", Some.Dotted.Path).Class'))
        .toEqual([ 'Root', 'method("this.arg", Some.Dotted.Path)', 'Class' ]);

      expect(parseDotChain('Root.method("quoted\\"escaped(").Class'))
        .toEqual([ 'Root', 'method("quoted\\"escaped(")', 'Class' ]);
    });

    it('should work with lambdas', () => {
      expect(parseDotChain('Root.method(someArg -> someArg.doStuff())'))
        .toEqual([ 'Root', 'method(someArg -> someArg.doStuff())' ]);
    });

    it('should work with contructors', () => {
      expect(parseDotChain('new Constructor().someMethod()'))
        .toEqual([ 'new Constructor()', 'someMethod()' ]);
    });
  });
});
