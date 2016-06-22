'use babel';

import { join } from 'path';

const ipc = require('electron').ipcRenderer;
const BrowserWindow = require('electron').remote.BrowserWindow;

class EditorTokens {
  WORKER_PATH = `file://${join(__dirname, 'editor-tokens-worker.html')}`;

  constructor() {
    this.grammar = atom.grammars.grammarForScopeName('source.java');
    this.tokens = new Map();

    ipc.on('tokens', (event, tokens) => {
      console.log('got tokens!', tokens);
    });

    this.worker = new BrowserWindow({ width: 900, height: 400, show: true });
    this.worker.openDevTools();
    this.worker.loadURL(this.WORKER_PATH);
    console.log('constructed');
  }

  get(editor) {
    if (!this.tokens.has(editor)) {
      this.initializeForEditor(editor);
    }

    return this.tokens.get(editor);
  }

  refreshTokens(editor) {
    console.log('sending tokenize');
    this.worker.webContents.send('tokenize', editor.getText(), BrowserWindow.getFocusedWindow().id);
    this.tokens.set(editor, this.grammar.tokenizeLines(editor.getText()));
  }

  initializeForEditor(editor) {
    this.refreshTokens(editor);

    editor.onDidSave(() => {
      this.refreshTokens(editor);
    });

    editor.onDidDestroy(() => {
      this.tokens.delete(editor);
    });
  }
}

export { EditorTokens };
