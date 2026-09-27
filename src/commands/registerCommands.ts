import * as vscode from "vscode";
import * as path from "node:path";
import { NoteTreeItem } from "../notes/noteItem";
import { NotesManager, type NoteExtension } from "../notes/notesManager";
import { NotesTreeProvider } from "../notes/notesTreeProvider";

export const ADDITIONAL_ROOTS_STORAGE_KEY = "devNotes.additionalRoots";

export function registerCommands(
  context: vscode.ExtensionContext,
  notesManager: NotesManager,
  treeProvider: NotesTreeProvider,
): void {
  const register = (
    command: string,
    callback: (...args: never[]) => unknown,
  ) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, callback),
    );
  };

  register("devNotes.newNote", async (selection?: NoteTreeItem) => {
    const name = await vscode.window.showInputBox({ prompt: "Note name" });
    if (!name) {
      return;
    }
    const format = await vscode.window.showQuickPick(
      [
        { label: "Markdown", extension: ".md" as const },
        { label: "Text", extension: ".txt" as const },
      ],
      { placeHolder: "Choose a file type" },
    );
    if (!format) {
      return;
    }

    await runCommand(async () => {
      const manager = selection
        ? treeProvider.getManager(selection.rootPath)
        : notesManager;
      if (!manager) {
        return;
      }
      const directory =
        selection?.isRoot || selection?.kind === "folder"
          ? selection.resourcePath
          : selection
            ? parentPath(selection)
            : manager.rootPath;
      const notePath = await manager.createNote(
        name,
        format.extension as NoteExtension,
        directory,
      );
      treeProvider.refresh();
      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(notePath),
      );
      await vscode.window.showTextDocument(document);
    });
  });

  register("devNotes.newFolder", async (selection?: NoteTreeItem) => {
    const name = await vscode.window.showInputBox({ prompt: "Folder name" });
    if (!name) {
      return;
    }
    await runCommand(async () => {
      const manager = selection
        ? treeProvider.getManager(selection.rootPath)
        : notesManager;
      if (!manager) {
        return;
      }
      const directory =
        selection?.isRoot || selection?.kind === "folder"
          ? selection.resourcePath
          : selection
            ? parentPath(selection)
            : manager.rootPath;
      await manager.createFolder(name, directory);
      treeProvider.refresh();
    });
  });

  register("devNotes.rename", async (selection?: NoteTreeItem) => {
    if (!selection) {
      return;
    }
    const newName = await vscode.window.showInputBox({
      prompt: "New name",
      value: selection.label?.toString(),
    });
    if (!newName) {
      return;
    }
    await runCommand(async () => {
      const manager = treeProvider.getManager(selection.rootPath);
      if (!manager) {
        return;
      }
      await manager.rename(selection.resourcePath, newName);
      treeProvider.refresh();
    });
  });

  register("devNotes.delete", async (selection?: NoteTreeItem) => {
    if (!selection) {
      return;
    }
    const name = selection.label?.toString() ?? "this item";
    const confirmation = await vscode.window.showWarningMessage(
      `Delete "${name}"?`,
      { modal: true },
      "Delete",
    );
    if (confirmation !== "Delete") {
      return;
    }
    await runCommand(async () => {
      const manager = treeProvider.getManager(selection.rootPath);
      if (!manager) {
        return;
      }
      await manager.delete(selection.resourcePath);
      treeProvider.refresh();
    });
  });

  register("devNotes.openNote", async (selection?: NoteTreeItem) => {
    if (!selection || selection.kind !== "note") {
      return;
    }
    await runCommand(async () => {
      const uri = vscode.Uri.file(selection.resourcePath);
      if (path.extname(selection.resourcePath).toLowerCase() === ".pdf") {
        await vscode.env.openExternal(uri);
        return;
      }
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    });
  });

  register("devNotes.revealNote", async (selection?: NoteTreeItem) => {
    if (!selection || selection.kind !== "note") {
      return;
    }
    await runCommand(async () => {
      await vscode.commands.executeCommand(
        "revealFileInOS",
        vscode.Uri.file(selection.resourcePath),
      );
    });
  });

  register("devNotes.refresh", () => treeProvider.refresh());
  register("devNotes.addRoot", async () => {
    const selection = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Add Folder",
      title: "Add Notes Folder",
    });
    const directory = selection?.[0]?.fsPath;
    if (!directory) {
      return;
    }
    await runCommand(async () => {
      await treeProvider.addRoot(directory);
      await context.globalState.update(
        ADDITIONAL_ROOTS_STORAGE_KEY,
        treeProvider.getAdditionalRootPaths(),
      );
    });
  });

  register("devNotes.removeRoot", async (selection?: NoteTreeItem) => {
    if (!selection?.isRoot || selection.isDefaultRoot) {
      return;
    }
    const confirmation = await vscode.window.showWarningMessage(
      `Remove "${selection.label?.toString()}" from Dev Notes? Its files will not be deleted.`,
      { modal: true },
      "Remove",
    );
    if (confirmation !== "Remove") {
      return;
    }
    treeProvider.removeRoot(selection.resourcePath);
    await context.globalState.update(
      ADDITIONAL_ROOTS_STORAGE_KEY,
      treeProvider.getAdditionalRootPaths(),
    );
  });

  register("devNotes.openNotesFolder", async (selection?: NoteTreeItem) => {
    await runCommand(async () => {
      await vscode.commands.executeCommand(
        "revealFileInOS",
        vscode.Uri.file(
          selection?.isRoot ? selection.resourcePath : notesManager.rootPath,
        ),
      );
    });
  });
}

function parentPath(selection: NoteTreeItem): string {
  return path.dirname(selection.resourcePath);
}

async function runCommand(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`Dev Notes: ${message}`);
  }
}
