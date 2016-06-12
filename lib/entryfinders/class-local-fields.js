'use babel';

import { tokenIsSquareBrackets, tokenIsStorageType, tokenIsVariableName } from '../util/tokens';

function getClassLocalFields(tokens, editor) {
  return tokens
    .map(row => row.filter(token =>
      !token.scopes.includes('meta.method.body.java') &&
      token.scopes.includes('meta.definition.variable.java') && (
        tokenIsSquareBrackets(token) ||
        tokenIsStorageType(token) ||
        tokenIsVariableName(token)
      )
    ))
    .filter(row => row.length >= 2) // Storage type and variable name
    .map(matchedTokens => {
      const brackets = matchedTokens.filter(token => -1 !== [ '[', ']' ].indexOf(token.value)).length;
      const type = matchedTokens.find(token => tokenIsStorageType(token)).value;
      const name = matchedTokens.find(token => tokenIsVariableName(token)).value;
      return {
        type: brackets > 0 ? `${type}${'[]'.repeat(brackets / 2)}` : (this.getFullyQualifiedClass(editor, type) || type),
        name: name
      };
    });
}

export { getClassLocalFields };
