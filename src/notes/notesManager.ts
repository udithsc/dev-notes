import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";

export type NoteEntryKind = "folder" | "note";
export type NoteExtension = ".md" | ".txt";

export interface NoteEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: NoteEntryKind;
}

export class NotesManager {
  readonly rootPath: string;
  private visibleExtensions: Set<string>;

  constructor(
    directory: string,
    visibleExtensions: readonly string[] = ["md", "txt", "pdf"],
  ) {
    this.rootPath = expandHomeDirectory(directory);
    this.visibleExtensions = normalizeExtensions(visibleExtensions);
  }

  setVisibleExtensions(extensions: readonly string[]): void {
    this.visibleExtensions = normalizeExtensions(extensions);
  }

  getVisibleExtensions(): string[] {
    return [...this.visibleExtensions];
  }

  async ensureRoot(): Promise<void> {
    await fs.mkdir(this.rootPath, { recursive: true });
    const details = await fs.stat(this.rootPath);
    if (!details.isDirectory()) {
      throw new Error(`Notes location is not a directory: ${this.rootPath}`);
    }
  }

  async validateRoot(): Promise<void> {
    const details = await fs.stat(this.rootPath);
    if (!details.isDirectory()) {
      throw new Error(`Notes location is not a directory: ${this.rootPath}`);
    }
  }

  async getEntries(directory = this.rootPath): Promise<NoteEntry[]> {
    const safeDirectory = this.resolveWithinRoot(directory);
    const entries = await fs.readdir(safeDirectory, { withFileTypes: true });
    const notes: NoteEntry[] = [];

    for (const entry of entries) {
      const entryPath = path.join(safeDirectory, entry.name);
      if (entry.isDirectory()) {
        notes.push({ name: entry.name, path: entryPath, kind: "folder" });
      } else if (
        entry.isFile() &&
        isSupportedNote(entry.name, this.visibleExtensions)
      ) {
        notes.push({ name: entry.name, path: entryPath, kind: "note" });
      }
    }

    return notes.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "folder" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  }

  async createNote(
    name: string,
    extension: NoteExtension,
    directory = this.rootPath,
  ): Promise<string> {
    const safeDirectory = this.resolveWithinRoot(directory);
    const safeName = normalizeNoteName(name, extension);
    const filePath = path.join(safeDirectory, safeName);
    await fs.writeFile(filePath, "", { flag: "wx" });
    return filePath;
  }

  async createFolder(name: string, directory = this.rootPath): Promise<string> {
    const safeDirectory = this.resolveWithinRoot(directory);
    const folderPath = path.join(safeDirectory, validateSegment(name));
    await fs.mkdir(folderPath);
    return folderPath;
  }

  async rename(target: string, newName: string): Promise<string> {
    const safeTarget = this.resolveWithinRoot(target);
    const details = await fs.lstat(safeTarget);
    let safeName = validateSegment(newName);

    if (details.isFile()) {
      const oldExtension = path.extname(safeTarget).toLowerCase();
      if (!isSupportedNote(safeTarget, this.visibleExtensions)) {
        throw new Error(
          "This file extension is not enabled in Dev Notes settings.",
        );
      }
      const newExtension = path.extname(safeName).toLowerCase();
      if (newExtension === "") {
        safeName += oldExtension;
      } else if (
        !this.visibleExtensions.has("*") &&
        !this.visibleExtensions.has(newExtension.slice(1))
      ) {
        throw new Error(
          "The new extension is not enabled in Dev Notes settings.",
        );
      }
    } else if (!details.isDirectory()) {
      throw new Error("Only notes and folders can be renamed.");
    }

    const renamedPath = path.join(path.dirname(safeTarget), safeName);
    if (renamedPath !== safeTarget) {
      await fs.rename(safeTarget, renamedPath);
    }
    return renamedPath;
  }

  async delete(target: string): Promise<void> {
    const safeTarget = this.resolveWithinRoot(target);
    if (safeTarget === this.rootPath) {
      throw new Error("The notes root cannot be deleted from this view.");
    }
    await fs.rm(safeTarget, { recursive: true });
  }

  private resolveWithinRoot(target: string): string {
    const resolved = path.resolve(target);
    const relative = path.relative(this.rootPath, resolved);
    if (
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      throw new Error("The selected path is outside the notes directory.");
    }
    return resolved;
  }
}

function expandHomeDirectory(directory: string): string {
  if (directory === "~") {
    return homedir();
  }
  if (directory.startsWith("~/") || directory.startsWith("~\\")) {
    return path.resolve(homedir(), directory.slice(2));
  }
  return path.resolve(directory);
}

function isSupportedNote(
  name: string,
  visibleExtensions: Set<string>,
): boolean {
  if (visibleExtensions.has("*")) {
    return true;
  }
  return visibleExtensions.has(path.extname(name).slice(1).toLowerCase());
}

function normalizeExtensions(extensions: readonly string[]): Set<string> {
  const normalized = extensions
    .map((extension) => extension.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
  return new Set(normalized.length ? normalized : ["md", "txt", "pdf"]);
}

function normalizeNoteName(name: string, extension: NoteExtension): string {
  const safeName = validateSegment(name);
  const existingExtension = path.extname(safeName).toLowerCase();
  if (existingExtension === "") {
    return `${safeName}${extension}`;
  }
  if (existingExtension === ".md" || existingExtension === ".txt") {
    return safeName;
  }
  throw new Error("Notes must use the .md or .txt extension.");
}

function validateSegment(name: string): string {
  const trimmed = name.trim();
  if (
    !trimmed ||
    trimmed === "." ||
    trimmed === ".." ||
    path.basename(trimmed) !== trimmed ||
    /[\\/]/.test(trimmed)
  ) {
    throw new Error("Enter a valid name without path separators.");
  }
  return trimmed;
}
