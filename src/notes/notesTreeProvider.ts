import * as vscode from "vscode";
import * as path from "node:path";
import { NoteTreeItem } from "./noteItem";
import { NotesManager } from "./notesManager";

export class NotesTreeProvider implements vscode.TreeDataProvider<NoteTreeItem> {
  private readonly changeEmitter = new vscode.EventEmitter<
    NoteTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private readonly rootsChangeEmitter = new vscode.EventEmitter<{
    rootPath: string;
    added: boolean;
  }>();
  readonly onDidChangeRoots = this.rootsChangeEmitter.event;
  private readonly managers = new Map<string, NotesManager>();
  private readonly additionalRootPaths = new Set<string>();

  constructor(
    private readonly defaultNotesManager: NotesManager,
    private readonly output: vscode.OutputChannel,
  ) {
    this.managers.set(defaultNotesManager.rootPath, defaultNotesManager);
  }

  getTreeItem(element: NoteTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NoteTreeItem): Promise<NoteTreeItem[]> {
    try {
      if (!element) {
        const roots = [
          {
            path: this.defaultNotesManager.rootPath,
            isDefault: true,
          },
          ...[...this.additionalRootPaths].map((rootPath) => ({
            path: rootPath,
            isDefault: false,
          })),
        ];
        return roots.map(
          (root) =>
            new NoteTreeItem(
              {
                name: path.basename(root.path) || root.path,
                path: root.path,
                kind: "folder",
              },
              root.path,
              true,
              root.isDefault,
            ),
        );
      }

      const manager = this.managers.get(element.rootPath);
      if (!manager) {
        return [];
      }
      const entries = await manager.getEntries(element.resourcePath);
      return entries.map((entry) => new NoteTreeItem(entry, element.rootPath));
    } catch (error) {
      this.output.appendLine(
        `Unable to read notes directory: ${errorMessage(error)}`,
      );
      return [];
    }
  }

  async addRoot(directory: string): Promise<string> {
    const manager = new NotesManager(
      directory,
      this.defaultNotesManager.getVisibleExtensions(),
    );
    await manager.validateRoot();
    if (manager.rootPath === this.defaultNotesManager.rootPath) {
      return manager.rootPath;
    }
    if (this.managers.has(manager.rootPath)) {
      return manager.rootPath;
    }
    this.managers.set(manager.rootPath, manager);
    this.additionalRootPaths.add(manager.rootPath);
    this.rootsChangeEmitter.fire({ rootPath: manager.rootPath, added: true });
    this.refresh();
    return manager.rootPath;
  }

  removeRoot(directory: string): void {
    const manager = new NotesManager(directory);
    if (this.additionalRootPaths.delete(manager.rootPath)) {
      this.managers.delete(manager.rootPath);
      this.rootsChangeEmitter.fire({
        rootPath: manager.rootPath,
        added: false,
      });
      this.refresh();
    }
  }

  getManager(rootPath: string): NotesManager | undefined {
    return this.managers.get(rootPath);
  }

  getAdditionalRootPaths(): string[] {
    return [...this.additionalRootPaths];
  }

  setVisibleExtensions(extensions: readonly string[]): void {
    for (const manager of this.managers.values()) {
      manager.setVisibleExtensions(extensions);
    }
    this.refresh();
  }

  refresh(): void {
    this.changeEmitter.fire();
  }

  dispose(): void {
    this.changeEmitter.dispose();
    this.rootsChangeEmitter.dispose();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
