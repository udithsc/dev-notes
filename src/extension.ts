import * as vscode from "vscode";
import {
  ADDITIONAL_ROOTS_STORAGE_KEY,
  registerCommands,
} from "./commands/registerCommands";
import { getConfig } from "./config";
import { debounce } from "./util";
import { NotesManager } from "./notes/notesManager";
import { NotesTreeProvider } from "./notes/notesTreeProvider";

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const output = vscode.window.createOutputChannel("Dev Notes");
  const notesManager = new NotesManager(getConfig().notesDirectory);
  const treeProvider = new NotesTreeProvider(notesManager, output);

  context.subscriptions.push(output, treeProvider);
  context.subscriptions.push(
    vscode.window.createTreeView("devNotes.notes", {
      treeDataProvider: treeProvider,
    }),
  );
  registerCommands(context, notesManager, treeProvider);

  const watchers = new Map<string, vscode.FileSystemWatcher>();
  const watchRoot = (rootPath: string): void => {
    if (watchers.has(rootPath)) {
      return;
    }
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(rootPath), "**/*"),
    );
    const refreshAfterFilesystemChange = debounce(
      () => treeProvider.refresh(),
      150,
    );
    context.subscriptions.push(
      watcher,
      watcher.onDidCreate(refreshAfterFilesystemChange),
      watcher.onDidChange(refreshAfterFilesystemChange),
      watcher.onDidDelete(refreshAfterFilesystemChange),
    );
    watchers.set(rootPath, watcher);
  };

  context.subscriptions.push(
    treeProvider.onDidChangeRoots(({ rootPath, added }) => {
      if (added) {
        watchRoot(rootPath);
      } else {
        watchers.get(rootPath)?.dispose();
        watchers.delete(rootPath);
      }
    }),
  );

  try {
    await notesManager.ensureRoot();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`Unable to initialize notes directory: ${message}`);
    void vscode.window.showErrorMessage(
      `Dev Notes: Unable to initialize notes directory. ${message}`,
    );
  }

  watchRoot(notesManager.rootPath);

  const savedRootPaths = context.globalState.get<string[]>(
    ADDITIONAL_ROOTS_STORAGE_KEY,
    [],
  );
  for (const rootPath of savedRootPaths) {
    try {
      await treeProvider.addRoot(rootPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(
        `Unable to restore notes folder ${rootPath}: ${message}`,
      );
    }
  }
}

export function deactivate(): void {}
