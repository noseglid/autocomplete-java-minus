'use babel';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { Task } from 'atom';
import bluebird from 'bluebird';

const readFile = bluebird.promisify(fs.readFile);

function readClassPath() {
  const paths = atom.project.getPaths();
  if (paths.length !== 1) {
    atom.notifications.addError('Only one open project supported.');
    return Promise.reject();
  }

  return readFile(`${paths[0]}/.classpath`)
    .then(classpath => classpath.toString('utf8').split(path.delimiter))
    .then(entries => entries.filter(entry => entry.endsWith('.jar')));
}

export const collect = (dictionary) => {
  return new Promise((resolve, reject) => {
    readClassPath().then(classpathEntries => {
      const tasks = os.cpus().length - 1; // leave one cpu free for other tasks, such as rendering
      const chunk = Math.ceil(classpathEntries.length / tasks);

      let done = 0;
      const donefn = () => (++done === tasks) && resolve();

      for (let i = 0; i < tasks; ++i) {
        const entries = classpathEntries.slice(i * chunk, (i + 1) * chunk);
        const task = Task.once(require.resolve('./collector-task'), entries, donefn);
        task.on('entry', (entry) => dictionary.add(entry.name, entry));
      }
    });
  });
};
