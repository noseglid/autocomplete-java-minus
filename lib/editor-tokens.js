'use babel';

import { join } from 'path';
import { ipcRenderer as ipc, remote } from 'electron';

class EditorTokens {
  WORKER_PATH = `file://${join(__dirname, 'editor-tokens-worker.html')}`;

  constructor() {
    this.awaitingTokens = false;
    this.tokens = new Map();

    this.worker = new remote.BrowserWindow({ width: 50, height: 50, show: false });
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
      const grammar = atom.grammars.grammarForScopeName('source.java');
      if (!grammar) {
        // Oops. Not loaded yet. It will be sent before tokenizing
        return;
      }

      this.worker.webContents.send('grammar-path', grammar.path);
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

    const grammar = atom.grammars.grammarForScopeName('source.java');
    if (!grammar) {
      // Not loaded. Java grammar possibly not installed. Skip refreshing.
      return;
    }

    this.worker.webContents.send('grammar-path', grammar.path);
    this.worker.webContents.send('tokenize',
      editor.id,
      editor.getText(),
      remote.BrowserWindow.getFocusedWindow().id
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
