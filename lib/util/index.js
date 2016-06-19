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
 * SomeCode;
 * OtherCode.methods();
 * return this.is(Some.Argument).
 *   a.dotChain("this is a string!").ne<Cursor>
 * ```
 * Would extract `this.is(Some.Argument).a.dotChain("this is a string!").ne`
 */
function extractDotChain(code) {
  const result = [];

  let parensDepth = 0;
  let quoted = false;
  let transitioning = false;
  let hasDot = false;
  for (let i = code.length - 1; i >= 0; i--) {
    const char = code[i];
    const isWhitespace = /\s/.test(char);
    const isDot = '.' === char;

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

    if (quoted) {
      // Anything goes here
      result.unshift(char);
      continue;
    }

    if (parensDepth < 0) {
      // This means we reached a (, without a ) first
      break;
    }

    if (parensDepth > 0 || '(' === char) {
      // Anything goes here, but skip whitespaces for convenience
      if (!isWhitespace) {
        result.unshift(char);
      }
      continue;
    }

    if (transitioning && isWhitespace) {
      continue;
    }

    if (-1 !== [ ';', '{', '(' ].indexOf(char) && !quoted && parensDepth === 0) {
      break;
    }

    if (transitioning && !isWhitespace && !hasDot && !isDot) {
      // Previous was white space, this is not a whitespace and there has not been a dot.
      // This must be the end of the dotchain
      if (char === 'w' && code[i - 1] === 'e' && code[i - 2] === 'n') {
        // Include the keyword `new` so it can later be identified that this is a constructor.
        result.unshift('n', 'e', 'w', ' ');
      }
      break;
    }

    transitioning = isWhitespace || isDot;
    hasDot = isDot;
    if (!isWhitespace) {
      result.unshift(char);
    }
  }

  return result.join('');
}

/**
 * Parses a Java Dot chain, like
 * `Root.Class.method().other("args etc, with dots.", Other.Thing.class)`
 * Into an array which is split on the "top level dots", that is
 * [ 'Root', 'Class', 'method()', 'other("args etc, with dots.", Other.Thing.class)' ]
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
