import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { NotesManager } from "../notes/notesManager";
import { NotesTreeProvider } from "../notes/notesTreeProvider";

suite("NotesManager", () => {
  let temporaryDirectory: string;
  let notesManager: NotesManager;

  setup(async () => {
    temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "dev-notes-test-"),
    );
    notesManager = new NotesManager(path.join(temporaryDirectory, "notes"));
  });

  teardown(async () => {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  test("creates the configured notes directory", async () => {
    await notesManager.ensureRoot();
    assert.equal((await fs.stat(notesManager.rootPath)).isDirectory(), true);
  });

  test("discovers folders and supported files but filters other files", async () => {
    await notesManager.ensureRoot();
    await notesManager.createFolder("React");
    await fs.writeFile(path.join(notesManager.rootPath, "readme.md"), "");
    await fs.writeFile(path.join(notesManager.rootPath, "commands.TXT"), "");
    await fs.writeFile(path.join(notesManager.rootPath, "reference.pdf"), "");
    await fs.writeFile(path.join(notesManager.rootPath, "image.png"), "");

    const entries = await notesManager.getEntries();
    assert.deepEqual(
      entries.map((entry) => `${entry.kind}:${entry.name}`),
      [
        "folder:React",
        "note:commands.TXT",
        "note:readme.md",
        "note:reference.pdf",
      ],
    );
  });

  test("creates, renames while preserving the extension, and deletes a note", async () => {
    await notesManager.ensureRoot();
    const originalPath = await notesManager.createNote("use-hook", ".md");
    const renamedPath = await notesManager.rename(
      originalPath,
      "react-use-hook",
    );

    assert.equal(path.basename(renamedPath), "react-use-hook.md");
    await notesManager.delete(renamedPath);
    await assert.rejects(fs.access(renamedPath));
  });

  test("preserves the PDF extension when renaming a PDF", async () => {
    await notesManager.ensureRoot();
    const originalPath = path.join(notesManager.rootPath, "reference.pdf");
    await fs.writeFile(originalPath, "");

    const renamedPath = await notesManager.rename(
      originalPath,
      "reference-2026",
    );

    assert.equal(path.basename(renamedPath), "reference-2026.pdf");
  });

  test("lists and manages an added folder as a separate root", async () => {
    await notesManager.ensureRoot();
    const customRoot = path.join(temporaryDirectory, "Documents");
    await fs.mkdir(customRoot);
    const output = {
      appendLine: (_message: string) => undefined,
    } as vscode.OutputChannel;
    const provider = new NotesTreeProvider(notesManager, output);

    try {
      await provider.addRoot(customRoot);
      const roots = await provider.getChildren();
      const customRootItem = roots.find(
        (root) => root.resourcePath === customRoot,
      );
      assert.ok(customRootItem);
      assert.equal(customRootItem.isRoot, true);

      const customManager = provider.getManager(customRootItem.rootPath);
      assert.ok(customManager);
      await customManager.createNote("document", ".md");
      const children = await provider.getChildren(customRootItem);
      assert.deepEqual(
        children.map((child) => child.label),
        ["document.md"],
      );

      provider.removeRoot(customRoot);
      assert.equal((await provider.getChildren()).length, 1);
      assert.equal(
        (await fs.readdir(customRoot)).includes("document.md"),
        true,
      );
    } finally {
      provider.dispose();
    }
  });

  test("rejects names that escape the notes directory", async () => {
    await notesManager.ensureRoot();
    await assert.rejects(notesManager.createFolder("../outside"), /valid name/);
  });

  test("activates the extension and creates its configured root", async () => {
    const notesRoot = path.join(temporaryDirectory, "extension-notes");
    await vscode.workspace
      .getConfiguration("devNotes")
      .update("notesDirectory", notesRoot, vscode.ConfigurationTarget.Global);
    const extension = vscode.extensions.all.find(
      (candidate) => candidate.packageJSON.name === "dev-notes",
    );
    assert.ok(extension);

    await extension.activate();

    assert.equal((await fs.stat(notesRoot)).isDirectory(), true);
    assert.ok(
      (await vscode.commands.getCommands()).includes("devNotes.newNote"),
    );
  });
});
