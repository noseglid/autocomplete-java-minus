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
      this.initiate();
    }
    return this.provider;
  },

  consumeJavaImport(javaImport) {
    this.provider.setImportHandler(javaImport);
  },

  consumeJavaClasspathRegistry(classpathRegistry) {
    this.classpathRegistry = classpathRegistry;
    this.initiate();
  }

};
