'use babel';

import { tokenIsSquareBrackets, tokenIsStorageType, tokenIsVariableName } from '../util/tokens';

function countBrackets(tokens) {
  let brackets = 0;
  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];
    if (-1 !== [ '[', ']' ].indexOf(token.value)) {
      brackets++;
    }
    if (token.scopes.includes('keyword.operator.assignment.java')) {
      break;
    }
  }
  return brackets;
}

function getClassLocalFields(tokens, editor) {
  return tokens
    .map(row => row.filter(token =>
      !token.scopes.includes('meta.method.body.java') &&
      token.scopes.includes('meta.definition.variable.java') && (
        token.scopes.includes('keyword.operator.assignment.java') ||
        tokenIsSquareBrackets(token) ||
        tokenIsStorageType(token) ||
        tokenIsVariableName(token)
      )
    ))
    .map(matchedTokens => {
      const brackets = countBrackets(matchedTokens);
      const type = matchedTokens.find(token => tokenIsStorageType(token));
      if (!type) {
        return false;
      }
      const name = matchedTokens.find(token => tokenIsVariableName(token));
      if (!name) {
        return false;
      }
      return {
        type: brackets > 0 ? `${type.value}${'[]'.repeat(brackets / 2)}` : (this.getFullyQualifiedClass(editor, type.value) || type.value),
        name: name.value
      };
    })
    .filter(Boolean);
}

export { getClassLocalFields };
