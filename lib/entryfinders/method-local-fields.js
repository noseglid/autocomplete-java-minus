'use babel';

function stepBack({ row, col }, tokens) {
  col--;
  if (col < 0) {
    row--;
    if (row < 0) {
      return false;
    }
    col = tokens[row].length - 1;
  }
  return { row, col };
}

function scopeBreak(token) {
  return (
    token.scopes.includes('entity.name.function.java') &&
    token.scopes.includes('meta.method.identifier.java')
  );
}

function getMethodLocalFields(tokens, editor, bufferPosition) {
  let pos = {
    row: bufferPosition.row,
    col: tokens[bufferPosition.row].length - 1
  };
  let memo = {};
  const fields = [];
  while (!scopeBreak(tokens[pos.row][pos.col])) {
    const token = tokens[pos.row][pos.col];
    const inc = token.scopes.includes.bind(token.scopes);

    if (inc('meta.definition.variable.java') && (inc('storage.type.java') || inc('storage.type.primitive.java')) || // Type of method variable
        inc('meta.method.identifier.java') && (inc('storage.type.java') || inc('storage.type.primitive.java'))) { // Type of method parameter
      memo.type = this.getFullyQualifiedClass(editor, token.value) || token.value;
    }
    if (inc('meta.definition.variable.java') && inc('variable.definition.java') || // Variable name
        inc('meta.method.identifier.java') && inc('variable.parameter.java')) { // Parameter name
      memo.name = token.value;
    }
    if (memo.type && memo.name) {
      fields.push(memo);
      memo = {};
    }

    pos = stepBack(pos, tokens);
    if (false === pos) {
      // Stepped backwards through file and no function definition found
      return [];
    }
  }

  return fields;
}

export { getMethodLocalFields };
