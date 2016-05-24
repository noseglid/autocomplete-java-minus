'use babel';

function denamespace(klass) {
  return klass.substr(klass.lastIndexOf('.') + 1);
}

function packagify(klass) {
  return klass.substr(0, klass.lastIndexOf('.'));
}

/**
 * Returns the name from a method identifier.
 * e.g. `someMethod(String arg1)` => `someMethod`
 */
function nameify(methodIdentifier) {
  return methodIdentifier.match(/^([^\(]*).*$/)[1];
}

function filterFalsyArray(entries) {
  return entries.filter(Boolean);
}

/**
 * Parses a Java Dot chain, like
 * `Root.Class.method().other("args etc, with dots", Other.Thing.class)`
 * Into an array which is split on the "top level dots".
 */
function parseDotChain(code) {
  const parts = [];

  let parensDepth = 0;
  let quoted = false;
  let current = '';
  for (const char of code) {
    current += char;
    switch (char) {
      case '"':
        if (current[current.length - 2] !== '\\') quoted = !quoted;
        break;
      case '(':
        if (!quoted) parensDepth++;
        break;

      case ')':
        if (!quoted) parensDepth--;
        break;

      case '.':
        if (parensDepth === 0 && !quoted) {
          parts.push(current.slice(0, -1)); // Skip the dot
          current = '';
        }
        break;
    }
  }

  if (parensDepth > 0 || quoted) {
    // This is not a complete dotChain. We are in a parenthesis or quotes. Do nothing
    return [];
  }

  // Push the final part
  parts.push(current);

  return parts;
}

export {
  denamespace,
  packagify,
  nameify,
  filterFalsyArray,
  parseDotChain
};
