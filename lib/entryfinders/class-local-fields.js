'use babel';

function getClassLocalFields(tokens, editor) {
  return tokens
    .map(row => row.filter(token =>
      token.scopes.includes('meta.definition.variable.java') &&
      (
        token.scopes.includes('storage.type.java') ||
        token.scopes.includes('storage.type.primitive.java') ||
        token.scopes.includes('variable.definition.java')
      )
    ))
    .filter(row => row.length >= 2) // Storage type and variable name
    .map(([ { value: type }, { value: name } ]) => ({
      type: this.getFullyQualifiedClass(editor, type) || type,
      name
    }));
}

export { getClassLocalFields };
