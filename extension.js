'use strict';

const vscode = require('vscode');

const { CodexStateError, getSessionLabel, readLocalVscodeSessions } = require('./lib/codex-state');
const { getCopyableSessionId, getCopyableSessionName } = require('./lib/session-command-values');
const { filterSessionsForWorkspaceRoots } = require('./lib/workspace-paths');

const CODEX_EXTENSION_ID = 'openai.chatgpt';
const CODEX_EDITOR_VIEW_TYPE = 'chatgpt.conversationEditor';
const SHOW_ARCHIVED_SETTING = 'codexSession.showArchived';

class SessionTreeItem extends vscode.TreeItem {
  constructor(session) {
    const label = getSessionLabel(session);
    super(label, vscode.TreeItemCollapsibleState.None);

    this.session = session;
    const timestamp = formatTimestamp(session.updatedAtMs);
    this.description = session.archived ? `${timestamp} · Archived` : timestamp;
    this.tooltip = [
      label,
      '',
      `Working directory: ${session.cwd}`,
      `Session ID: ${session.id}`,
      ...(session.archived ? ['Status: Archived'] : []),
    ].join('\n');
    this.iconPath = new vscode.ThemeIcon(session.archived ? 'archive' : 'comment-discussion');
    this.contextValue = 'codexSession.session';
    this.command = {
      command: 'codexSession.open',
      title: 'Open Codex Session',
      arguments: [session],
    };
    this.accessibilityInformation = {
      label: `${label}, updated ${this.description}, ${session.cwd}`,
    };
  }
}

class StatusTreeItem extends vscode.TreeItem {
  constructor(label, detail, iconId) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = detail || label;
    this.iconPath = new vscode.ThemeIcon(iconId);
  }
}

class CodexSessionTreeProvider {
  constructor() {
    this.items = [];
    this.changeEmitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.changeEmitter.event;
  }

  dispose() {
    this.changeEmitter.dispose();
  }

  getTreeItem(item) {
    return item;
  }

  getChildren(item) {
    return item ? [] : this.items;
  }

  refresh() {
    this.items = this.loadItems();
    this.changeEmitter.fire(undefined);
  }

  loadItems() {
    if (vscode.env.remoteName) {
      return [
        new StatusTreeItem(
          'Remote workspaces are not supported',
          `This extension runs only in a local VS Code window. Remote kind: ${vscode.env.remoteName}`,
          'info',
        ),
      ];
    }

    const workspaceRoots = (vscode.workspace.workspaceFolders || [])
      .filter((folder) => folder.uri.scheme === 'file')
      .map((folder) => folder.uri.fsPath);

    if (workspaceRoots.length === 0) {
      return [
        new StatusTreeItem(
          'Open a local folder or workspace',
          'Codex sessions are matched against the folders in the current workspace.',
          'folder-opened',
        ),
      ];
    }

    try {
      const showArchived = vscode.workspace
        .getConfiguration('codexSession')
        .get('showArchived', false);
      const sessions = readLocalVscodeSessions({ includeArchived: showArchived });
      const matchingSessions = filterSessionsForWorkspaceRoots(sessions, workspaceRoots);

      if (matchingSessions.length === 0) {
        const archiveQualifier = showArchived ? '' : 'unarchived ';
        return [
          new StatusTreeItem(
            'No matching Codex sessions',
            `No ${archiveQualifier}VS Code Codex sessions were found below: ${workspaceRoots.join(', ')}`,
            'search',
          ),
        ];
      }

      return matchingSessions.map((session) => new SessionTreeItem(session));
    } catch (error) {
      const message =
        error instanceof CodexStateError
          ? error.message
          : `Could not read Codex sessions: ${error instanceof Error ? error.message : String(error)}`;

      return [new StatusTreeItem('Codex session data is unavailable', message, 'error')];
    }
  }
}

function formatTimestamp(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

async function openCodexSession(session) {
  try {
    if (!session || typeof session.id !== 'string' || !/^[A-Za-z0-9._-]+$/.test(session.id)) {
      throw new Error('The session ID has an unsupported format.');
    }

    const codexExtension = vscode.extensions.getExtension(CODEX_EXTENSION_ID);
    if (!codexExtension) {
      throw new Error('The official OpenAI Codex extension is not installed.');
    }

    await codexExtension.activate();

    const resource = vscode.Uri.from({
      scheme: 'openai-codex',
      authority: 'route',
      path: `/local/${session.id}`,
    });

    await vscode.commands.executeCommand('vscode.openWith', resource, CODEX_EDITOR_VIEW_TYPE, {
      viewColumn: vscode.ViewColumn.Active,
      preserveFocus: false,
      preview: false,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Could not open the Codex session: ${detail}`);
  }
}

async function copySessionText(value, description) {
  try {
    if (typeof value !== 'string' || !value) {
      throw new Error(`The ${description} is unavailable.`);
    }

    await vscode.env.clipboard.writeText(value);
    vscode.window.setStatusBarMessage(`Copied ${description}`, 2000);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Could not copy the ${description}: ${detail}`);
  }
}

async function copySessionName(commandArgument) {
  await copySessionText(getCopyableSessionName(commandArgument), 'session name');
}

async function copySessionId(commandArgument) {
  await copySessionText(getCopyableSessionId(commandArgument), 'session ID');
}

async function setShowArchived(showArchived) {
  const configuration = vscode.workspace.getConfiguration('codexSession');
  const inspection = configuration.inspect('showArchived');
  let target = vscode.ConfigurationTarget.Global;

  if (inspection?.workspaceFolderValue !== undefined) {
    target = vscode.ConfigurationTarget.WorkspaceFolder;
  } else if (inspection?.workspaceValue !== undefined) {
    target = vscode.ConfigurationTarget.Workspace;
  }

  await configuration.update('showArchived', showArchived, target);
}

function activate(context) {
  const provider = new CodexSessionTreeProvider();
  const treeView = vscode.window.createTreeView('codexSession.sessions', {
    treeDataProvider: provider,
    showCollapseAll: false,
  });

  context.subscriptions.push(
    provider,
    treeView,
    vscode.commands.registerCommand('codexSession.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('codexSession.open', openCodexSession),
    vscode.commands.registerCommand('codexSession.copyName', copySessionName),
    vscode.commands.registerCommand('codexSession.copyId', copySessionId),
    vscode.commands.registerCommand('codexSession.showArchived', () => setShowArchived(true)),
    vscode.commands.registerCommand('codexSession.hideArchived', () => setShowArchived(false)),
    vscode.workspace.onDidChangeWorkspaceFolders(() => provider.refresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(SHOW_ARCHIVED_SETTING)) {
        provider.refresh();
      }
    }),
    treeView.onDidChangeVisibility((event) => {
      if (event.visible) {
        provider.refresh();
      }
    }),
  );

  provider.refresh();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
