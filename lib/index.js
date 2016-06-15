'use babel';

export default {

  initiate() {
    if (this.provider && this.classpathRegistry) {
      this.provider.setRegistry(this.classpathRegistry);
    }
  },

  provide() {
    if (!this.provider) {
      const Provider = require('./provider');
      this.provider = new Provider();
      if (this.importHandler) {
        this.provider.setImportHandler(this.importHandler);
      }
      this.initiate();
    }
    return this.provider;
  },

  consumeJavaImport(javaImport) {
    this.importHandler = javaImport;
    if (this.provider) {
      this.provider.setImportHandler(javaImport);
    }
  },

  consumeJavaClasspathRegistry(classpathRegistry) {
    this.classpathRegistry = classpathRegistry;
    this.initiate();
  }

};
