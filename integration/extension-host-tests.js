'use strict';

const assert = require('node:assert/strict');
const vscode = require('vscode');

async function run() {
  const extension = vscode.extensions.getExtension('nilfs.codex-session-navigator');
  assert.ok(extension, 'The Codex Session Navigator development extension was not loaded.');
  await extension.activate();

  const originalClipboardText = await vscode.env.clipboard.readText();
  const configuration = vscode.workspace.getConfiguration('codexSessionNavigator');
  const originalShowArchived = configuration.inspect('showArchived').globalValue;

  const session = {
    id: 'integration-session-id',
    name: 'Integration clipboard session',
    preview: 'Fallback preview',
  };
  const treeItemArgument = new vscode.TreeItem(session.name, vscode.TreeItemCollapsibleState.None);
  treeItemArgument.session = session;

  try {
    await vscode.commands.executeCommand('codexSessionNavigator.copyName', treeItemArgument);
    assert.equal(
      await vscode.env.clipboard.readText(),
      'Integration clipboard session',
      'Copy Session Name did not write the TreeItem session name to the VS Code clipboard.',
    );

    await vscode.commands.executeCommand('codexSessionNavigator.copyId', treeItemArgument);
    assert.equal(
      await vscode.env.clipboard.readText(),
      'integration-session-id',
      'Copy Session ID did not write the TreeItem session ID to the VS Code clipboard.',
    );

    await vscode.commands.executeCommand('codexSessionNavigator.showArchived');
    assert.equal(
      vscode.workspace.getConfiguration('codexSessionNavigator').get('showArchived'),
      true,
      'Show Archived Sessions did not persist the setting.',
    );

    await vscode.commands.executeCommand('codexSessionNavigator.hideArchived');
    assert.equal(
      vscode.workspace.getConfiguration('codexSessionNavigator').get('showArchived'),
      false,
      'Hide Archived Sessions did not persist the setting.',
    );
  } finally {
    await vscode.env.clipboard.writeText(originalClipboardText);
    await vscode.workspace
      .getConfiguration('codexSessionNavigator')
      .update('showArchived', originalShowArchived, vscode.ConfigurationTarget.Global);
  }
}

module.exports = { run };
