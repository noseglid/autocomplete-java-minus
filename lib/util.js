'use babel';

function denamespace(klass) {
  return klass.substr(klass.lastIndexOf('.') + 1);
}

function packagify(klass) {
  return klass.substr(0, klass.lastIndexOf('.'));
}

export { denamespace, packagify };
