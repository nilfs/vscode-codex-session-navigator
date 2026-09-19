'use strict';

const assert = require('node:assert/strict');
const vscode = require('vscode');

async function run() {
  const extension = vscode.extensions.getExtension('nilfs.codex-session');
  assert.ok(extension, 'The Codex Sessions development extension was not loaded.');
  await extension.activate();

  const originalClipboardText = await vscode.env.clipboard.readText();
  const configuration = vscode.workspace.getConfiguration('codexSession');
  const originalShowArchived = configuration.inspect('showArchived').globalValue;

  const session = {
    id: 'integration-session-id',
    name: 'Integration clipboard session',
    preview: 'Fallback preview',
  };
  const treeItemArgument = new vscode.TreeItem(session.name, vscode.TreeItemCollapsibleState.None);
  treeItemArgument.session = session;

  try {
    await vscode.commands.executeCommand('codexSession.copyName', treeItemArgument);
    assert.equal(
      await vscode.env.clipboard.readText(),
      'Integration clipboard session',
      'Copy Session Name did not write the TreeItem session name to the VS Code clipboard.',
    );

    await vscode.commands.executeCommand('codexSession.copyId', treeItemArgument);
    assert.equal(
      await vscode.env.clipboard.readText(),
      'integration-session-id',
      'Copy Session ID did not write the TreeItem session ID to the VS Code clipboard.',
    );

    await vscode.commands.executeCommand('codexSession.showArchived');
    assert.equal(
      vscode.workspace.getConfiguration('codexSession').get('showArchived'),
      true,
      'Show Archived Sessions did not persist the setting.',
    );

    await vscode.commands.executeCommand('codexSession.hideArchived');
    assert.equal(
      vscode.workspace.getConfiguration('codexSession').get('showArchived'),
      false,
      'Hide Archived Sessions did not persist the setting.',
    );
  } finally {
    await vscode.env.clipboard.writeText(originalClipboardText);
    await vscode.workspace
      .getConfiguration('codexSession')
      .update('showArchived', originalShowArchived, vscode.ConfigurationTarget.Global);
  }
}

module.exports = { run };
