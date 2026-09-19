'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const manifest = require('../package.json');

test('contributes copy commands for session tree items', () => {
  const commands = new Set(manifest.contributes.commands.map((entry) => entry.command));
  assert.equal(commands.has('codexSession.copyName'), true);
  assert.equal(commands.has('codexSession.copyId'), true);

  const contextCommands = manifest.contributes.menus['view/item/context'];
  assert.deepEqual(
    contextCommands.map((entry) => entry.command),
    ['codexSession.copyName', 'codexSession.copyId'],
  );
  assert.equal(
    contextCommands.every(
      (entry) => entry.when === 'view == codexSession.sessions && viewItem == codexSession.session',
    ),
    true,
  );

  const commandPaletteEntries = manifest.contributes.menus.commandPalette;
  assert.deepEqual(
    commandPaletteEntries.map((entry) => entry.command),
    ['codexSession.copyName', 'codexSession.copyId'],
  );
  assert.equal(
    commandPaletteEntries.every((entry) => entry.when === 'false'),
    true,
  );
});

test('contributes a persisted archived-session filter', () => {
  const property = manifest.contributes.configuration.properties['codexSession.showArchived'];
  assert.equal(property.type, 'boolean');
  assert.equal(property.default, false);

  const commands = new Set(manifest.contributes.commands.map((entry) => entry.command));
  assert.equal(commands.has('codexSession.showArchived'), true);
  assert.equal(commands.has('codexSession.hideArchived'), true);

  const viewTitleCommands = manifest.contributes.menus['view/title'];
  assert.equal(
    viewTitleCommands.some(
      (entry) =>
        entry.command === 'codexSession.showArchived' &&
        entry.when.includes('!config.codexSession.showArchived'),
    ),
    true,
  );
  assert.equal(
    viewTitleCommands.some(
      (entry) =>
        entry.command === 'codexSession.hideArchived' &&
        entry.when.includes('config.codexSession.showArchived'),
    ),
    true,
  );
});

test('packages the archived-session filter as version 0.2.0', () => {
  assert.equal(manifest.version, '0.2.0');
  assert.equal(manifest.scripts.package.includes('codex-session-0.2.0.vsix'), true);
});
