const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const roots = ['src', 'tests', 'scripts'];
const extensions = new Set(['.ts', '.tsx']);
let files = 0;
let errors = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) {
      files += 1;
      const input = fs.readFileSync(full, 'utf8');
      const result = ts.transpileModule(input, {
        fileName: full,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      for (const diagnostic of result.diagnostics ?? []) {
        errors += 1;
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        const line = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1 || 0;
        console.error(`SYNTAX FAIL ${path.relative(root, full)}:${line} ${message}`);
      }
    }
  }
}

for (const dir of roots) walk(path.join(root, dir));
console.log(`Syntax smoke: ${files} TypeScript files checked, ${errors} diagnostics.`);
process.exit(errors === 0 ? 0 : 1);
