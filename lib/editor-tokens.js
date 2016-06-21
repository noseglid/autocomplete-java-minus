'use babel';

class EditorTokens {

  constructor() {
    this.grammar = atom.grammars.grammarForScopeName('source.java');
    this.tokens = new Map();
  }

  get(editor) {
    if (!this.tokens.has(editor)) {
      this.initializeForEditor(editor);
    }

    return this.tokens.get(editor);
  }

  refreshTokens(editor) {
    this.tokens.set(editor, this.grammar.tokenizeLines(editor.getText()));
  }

  initializeForEditor(editor) {
    this.refreshTokens(editor);

    editor.onDidSave(() => {
      setTimeout(() => {
        this.refreshTokens(editor);
      }, 1000);
    });

    editor.onDidDestroy(() => {
      this.tokens.delete(editor);
    });
  }
}

export { EditorTokens };
