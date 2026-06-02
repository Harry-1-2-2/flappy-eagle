const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadGame() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No <script> block found in index.html');
  const sandbox = { module: { exports: {} }, console, Math };
  vm.createContext(sandbox);
  vm.runInContext(match[1], sandbox);
  return sandbox.module.exports;
}

module.exports = { loadGame };
