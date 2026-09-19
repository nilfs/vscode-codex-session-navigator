'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const manifest = require('../package.json');

test('uses the Codex Session Navigator public identity', () => {
  assert.equal(manifest.name, 'codex-session-navigator');
  assert.equal(manifest.displayName, 'Codex Session Navigator');
  assert.equal(manifest.publisher, 'nilfs');
  assert.equal(manifest.contributes.views.codexSessionNavigator[0].name, 'Workspace Sessions');
});

test('contributes copy commands for session tree items', () => {
  const commands = new Set(manifest.contributes.commands.map((entry) => entry.command));
  assert.equal(commands.has('codexSessionNavigator.copyName'), true);
  assert.equal(commands.has('codexSessionNavigator.copyId'), true);

  const contextCommands = manifest.contributes.menus['view/item/context'];
  assert.deepEqual(
    contextCommands.map((entry) => entry.command),
    ['codexSessionNavigator.copyName', 'codexSessionNavigator.copyId'],
  );
  assert.equal(
    contextCommands.every(
      (entry) =>
        entry.when ===
        'view == codexSessionNavigator.sessions && viewItem == codexSessionNavigator.session',
    ),
    true,
  );

  const commandPaletteEntries = manifest.contributes.menus.commandPalette;
  assert.deepEqual(
    commandPaletteEntries.map((entry) => entry.command),
    ['codexSessionNavigator.copyName', 'codexSessionNavigator.copyId'],
  );
  assert.equal(
    commandPaletteEntries.every((entry) => entry.when === 'false'),
    true,
  );
});

test('contributes a persisted archived-session filter', () => {
  const property =
    manifest.contributes.configuration.properties['codexSessionNavigator.showArchived'];
  assert.equal(property.type, 'boolean');
  assert.equal(property.default, false);

  const commands = new Set(manifest.contributes.commands.map((entry) => entry.command));
  assert.equal(commands.has('codexSessionNavigator.showArchived'), true);
  assert.equal(commands.has('codexSessionNavigator.hideArchived'), true);

  const viewTitleCommands = manifest.contributes.menus['view/title'];
  assert.equal(
    viewTitleCommands.some(
      (entry) =>
        entry.command === 'codexSessionNavigator.showArchived' &&
        entry.when.includes('!config.codexSessionNavigator.showArchived'),
    ),
    true,
  );
  assert.equal(
    viewTitleCommands.some(
      (entry) =>
        entry.command === 'codexSessionNavigator.hideArchived' &&
        entry.when.includes('config.codexSessionNavigator.showArchived'),
    ),
    true,
  );
});

test('packages the archived-session filter as version 0.2.0', () => {
  assert.equal(manifest.version, '0.2.0');
  assert.equal(manifest.scripts.package.includes('codex-session-navigator-0.2.0.vsix'), true);
});
