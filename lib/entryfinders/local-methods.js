'use babel';

function getLocalMethods(tokens, editor) {
  return [].concat.apply([], tokens).reduce((memo, token) => {
    const inc = token.scopes.includes.bind(token.scopes);
    if (memo.inMethod && !inc('meta.method.java')) {
      if (memo.method.signature.returnValue) {
        /* If there's no return value, then it's the constructor. Omit it. */
        memo.methods.push(memo.method);
      }

      memo.method = { name: null, signature: { arguments: [], returnValue: null } };
      memo.inMethod = false;
    }

    if (!inc('meta.method.java')) {
      return memo;
    }

    memo.inMethod = true;
    if (inc('meta.method.return-type.java')) {
      memo.method.signature.returnValue = this.getFullyQualifiedClass(editor, token.value) || token.value;
    }
    if (inc('entity.name.function.java')) {
      memo.method.name = token.value;
    }
    if (inc('meta.method.identifier.java') && (inc('storage.type.java') || inc('storage.type.primitive.java'))) {
      memo.method.signature.arguments.push(token.value);
    }

    return memo;
  }, {
    inMethod: false,
    method: { name: null, signature: { arguments: [], returnValue: null } },
    methods: []
  }).methods;
}

export { getLocalMethods };
