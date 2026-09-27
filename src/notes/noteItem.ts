import * as vscode from "vscode";
import type { NoteEntry } from "./notesManager";

export class NoteTreeItem extends vscode.TreeItem {
  readonly resourcePath: string;
  readonly kind: NoteEntry["kind"];
  readonly rootPath: string;
  readonly isRoot: boolean;
  readonly isDefaultRoot: boolean;

  constructor(
    entry: NoteEntry,
    rootPath: string,
    isRoot = false,
    isDefaultRoot = false,
  ) {
    super(
      entry.name,
      entry.kind === "folder"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    this.resourcePath = entry.path;
    this.kind = entry.kind;
    this.rootPath = rootPath;
    this.isRoot = isRoot;
    this.isDefaultRoot = isDefaultRoot;
    this.contextValue = isRoot
      ? isDefaultRoot
        ? "defaultRoot"
        : "root"
      : entry.kind;
    this.iconPath = new vscode.ThemeIcon(
      entry.kind === "folder" ? "folder" : "file",
    );

    if (entry.kind === "note") {
      this.resourceUri = vscode.Uri.file(entry.path);
      this.command = {
        command: "devNotes.openNote",
        title: "Open Note",
        arguments: [this],
      };
    }
  }
}
