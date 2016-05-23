'use babel';

import { parseDotChain } from '../lib/util';

describe('Util', () => {
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
  });
});
