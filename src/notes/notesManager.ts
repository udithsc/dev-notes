import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";

export type NoteEntryKind = "folder" | "note";
export type NoteExtension = ".md" | ".txt";
type SupportedFileExtension = NoteExtension | ".pdf";

export interface NoteEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: NoteEntryKind;
}

const supportedExtensions = new Set<SupportedFileExtension>([
  ".md",
  ".txt",
  ".pdf",
]);

export class NotesManager {
  readonly rootPath: string;

  constructor(directory: string) {
    this.rootPath = expandHomeDirectory(directory);
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
      } else if (entry.isFile() && isSupportedNote(entry.name)) {
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
      const oldExtension = path
        .extname(safeTarget)
        .toLowerCase() as SupportedFileExtension;
      if (!supportedExtensions.has(oldExtension)) {
        throw new Error("Only .md, .txt, and .pdf files can be renamed here.");
      }
      const newExtension = path.extname(safeName).toLowerCase();
      if (newExtension === "") {
        safeName += oldExtension;
      } else if (
        !supportedExtensions.has(newExtension as SupportedFileExtension)
      ) {
        throw new Error("Files must use the .md, .txt, or .pdf extension.");
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

function isSupportedNote(name: string): boolean {
  return supportedExtensions.has(
    path.extname(name).toLowerCase() as SupportedFileExtension,
  );
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
