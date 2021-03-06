import { existsSync } from 'fs';
import spawn from 'cross-spawn';
import concat from 'concat-stream';
import os from 'os';

const PATH = process.env.PATH;

/**
 * Set current directory to ./tests so that all paths can be set as relative to test folder
 */
export function setTestFolder() {
  const originalCwd = process.cwd();

  before(function() {
    process.chdir(__dirname);
  });

  after(function() {
    process.chdir(originalCwd);
  });
}

export function mockEOL() {
  const originalEOL = os.EOL;

  before(function() {
    // Unify EOL for snapshots
    Object.defineProperty(os, 'EOL', {
      value: '\r\n',
    });
  });

  after(function() {
    Object.defineProperty(os, 'EOL', {
      value: originalEOL,
    });
  });
}

/*
  `createProcess` and `execute` are from
  https://gist.github.com/zorrodg/c349cf54a3f6d0a9ba62e0f4066f31cb
  https://medium.com/@zorrodg/integration-tests-on-node-js-cli-part-1-why-and-how-fa5b1ba552fe
*/

/**
 * Creates a child process with script path
 * @param {string} processPath Path of the process to execute
 * @param {Array} args Arguments to the command
 */
function createProcess(processPath, args = []) {
  // Ensure that path exists
  if (!processPath || !existsSync(processPath)) {
    throw new Error('Invalid process path');
  }

  args = [processPath].concat(args);

  return spawn('node', args, {
    env: {
      NODE_ENV: 'test',
      preventAutoStart: false,
      PATH, // This is needed in order to get all the binaries in your current terminal
    },
    stdio: [null, null, null, 'ipc'], // This enables interprocess communication (IPC)
  });
}

/**
 * Creates a command and executes inputs (user responses) to the stdin.
 * Returns a promise that resolves when all inputs are sent.
 * Rejects the promise if any error.
 * @param {string} processPath Path of the process to execute
 * @param {Array} args Arguments to the command
 */
export function execute(processPath, args = []) {
  const childProcess = createProcess(processPath, args);
  childProcess.stdin.setEncoding('utf-8');

  return new Promise((resolve, reject) => {
    childProcess.stderr.once('data', error => {
      reject(error.toString());
    });
    childProcess.on('error', reject);
    // Collect output
    childProcess.stdout.pipe(
      concat(result => {
        resolve(result.toString());
      })
    );
  });
}
