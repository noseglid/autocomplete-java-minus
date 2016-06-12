'use babel';

function tokenIsSquareBrackets(token) {
  return token.scopes.includes('punctuation.bracket.square.java');
}

function tokenIsStorageType(token) {
  return (
    token.scopes.includes('storage.type.java') ||
    token.scopes.includes('storage.type.primitive.java') ||
    token.scopes.includes('storage.type.object.array.java') ||
    token.scopes.includes('storage.type.primitive.array.java')
  ) && !tokenIsSquareBrackets(token);
}

function tokenIsVariableName(token) {
  return (
    token.scopes.includes('variable.parameter.java') ||
    token.scopes.includes('variable.definition.java')
  );
}

export { tokenIsSquareBrackets, tokenIsStorageType, tokenIsVariableName };
