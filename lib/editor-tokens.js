'use babel';

import { join } from 'path';

const ipc = require('electron').ipcRenderer;
const BrowserWindow = require('electron').remote.BrowserWindow;

class EditorTokens {
  WORKER_PATH = `file://${join(__dirname, 'editor-tokens-worker.html')}`;

  constructor() {
    this.awaitingTokens = false;
    this.tokens = new Map();

    this.worker = new BrowserWindow({ width: 50, height: 50, show: false });
    this.worker.loadURL(this.WORKER_PATH);

    this._initializeIpc();
  }

  _initializeIpc() {
    ipc.on('tokens', (event, editorId, tokens) => {
      const editor = [ ...atom.textEditors.editors ].find(e => e.id === editorId);
      if (!editor) {
        return;
      }

      this.tokens.set(editor, tokens);
      this.awaitingTokens = false;
    });

    this.worker.webContents.once('did-finish-load', () => {
      const grammarPath = atom.grammars.grammarForScopeName('source.java').path;
      this.worker.webContents.send('grammar-path', grammarPath);
    });
  }

  get(editor) {
    if (!this.tokens.has(editor)) {
      this.initializeForEditor(editor);
      return [];
    }

    return this.tokens.get(editor);
  }

  refreshTokens(editor) {
    if (this.awaitingTokens) {
      // Quite CPU intensive, so don't have more than 1 running
      return;
    }

    this.awaitingTokens = true;
    this.worker.webContents.send('tokenize',
      editor.id,
      editor.getText(),
      BrowserWindow.getFocusedWindow().id
    );
  }

  initializeForEditor(editor) {
    this.refreshTokens(editor);

    editor.onDidStopChanging(() => {
      this.refreshTokens(editor);
    });

    editor.onDidDestroy(() => {
      this.tokens.delete(editor);
    });
  }
}

export { EditorTokens };
