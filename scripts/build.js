#!/usr/bin/env node
// Concatenates src/*.js into the HTML shell and writes:
//   public/index.html   – the deployable single-file game
//   build/game.js       – the bare game script (used by the headless tests)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const files = fs.readdirSync(srcDir).filter((f) => /^\d\d_.*\.js$/.test(f)).sort();
const js = files.map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8') + '\n').join('');
const shell = fs.readFileSync(path.join(srcDir, 'shell.html'), 'utf8');
if (!shell.includes('/*__GAME__*/')) throw new Error('shell.html is missing the /*__GAME__*/ marker');

// The game source lives inside <script type="text/plain">, so a literal </script must be escaped.
// Use a replacer function: a plain replacement string would interpret `$&` etc. in the game code.
const html = shell.replace('/*__GAME__*/', () => js.replace(/<\/script/g, '<\\/script'));

fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'index.html'), html);
fs.writeFileSync(path.join(root, 'build', 'game.js'), js);
console.log(`Built ${files.length} modules -> public/index.html (${(html.length / 1024).toFixed(0)} KB)`);
