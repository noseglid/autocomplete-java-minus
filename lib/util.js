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
 * Extracts the dot chain which ends at the end of `code`.
 *
 * ```
 * SomeCodje;
 * OtherCode.methods();
 * this.is(Some.Argument).
 *   a.dotChain("this is a string!").ne<Cursor>
 * ```
 * Would extract `this.is(Some.Argument).a.dotChain("this is a string!").ne`
 */
function extractDotChain(code) {
  let result = '';
  let parensDepth = 0;
  let quoted = false;
  for (let i = code.length - 1; i >= 0; i--) {
    const char = code[i];
    switch (char) {
      case '"':
        if (code[i - 1] !== '\\') quoted = !quoted;
        break;

      case ')': // Traversing backwards, this increases depth
        if (!quoted) parensDepth++;
        break;

      case '(': // Traversing backwards, this decreases depth
        if (!quoted) parensDepth--;
        break;
    }

    if (0 > parensDepth) {
      return result;
    }

    if (-1 !== [ ';', '{', '=' ].indexOf(char)) {
      return result;
    }

    if (quoted || !/\s/.test(char)) {
      result = char + result;
    }
  }

  return result;
}

/**
 * Parses a Java Dot chain, like
 * `Root.Class.method().other("args etc, with dots", Other.Thing.class)`
 * Into an array which is split on the "top level dots".
 */
function parseDotChain(dotChain) {
  const parts = [];

  let parensDepth = 0;
  let quoted = false;
  let current = '';
  for (const char of dotChain) {
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
  extractDotChain,
  parseDotChain
};
