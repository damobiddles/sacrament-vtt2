// The linter reads the code looking for real mistakes (a variable that is never defined, code that can never run, a typo in a name).
// It is pointed at the Sacrament RPG Table and the code that serves it. The older Sacrament pages (site/play, site/game, site/character, ...) are not checked yet.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'archive/**', 'site/game/**', 'site/character/**', 'site/legacy/**', 'site/blog/**', 'site/brand/**', 'private/**', 'docs/**', 'test-results/**', 'playwright-report/**', '.vtt-data/**', 'netlify/functions/builder-page.mjs', 'scripts/hearts/**', 'scripts/table-test/**', 'scripts/make-*', 'site/*.js', '!site/loot-roller.js'] },
  js.configs.recommended,
  // Stripping control characters from typed text is deliberate, so this rule would only flag correct code.
  { rules: { 'no-control-regex': 'off' } },
  {
    // the Sacrament RPG Table in the browser (older-style scripts: no import/export)
    files: ['site/vtt/**/*.js', 'site/sheet/**/*.js', 'site/loot-roller.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser, SacramentRules: 'readonly', module: 'readonly' } },
    rules: { 'no-unused-vars': ['warn', { args: 'none' }] },
  },
  {
    // the server side, the tests, the scripts: Node
    files: ['netlify/**/*.mjs', 'test/**/*.mjs', 'scripts/vtt/**/*.mjs', 'scripts/*.mjs', 'scripts/lib/*.mjs', 'scripts/inventory/*.mjs', 'playwright.config.mjs', 'eslint.config.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['warn', { args: 'none' }] },
  },
  {
    // scripts that drive a browser: Node, plus the page's own objects inside page.evaluate(...)
    files: ['scripts/vtt/**/*.cjs', 'e2e/**/*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': ['warn', { args: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    files: ['e2e/**/*.mjs'],
    languageOptions: { sourceType: 'module' },
  },
  { files: ['**/*.mjs', '**/*.js'], rules: { 'no-empty': ['error', { allowEmptyCatch: true }] } },
];
