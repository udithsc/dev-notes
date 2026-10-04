import * as vscode from "vscode";

export interface DevNotesConfig {
  readonly notesDirectory: string;
  readonly defaultNoteExtension: "md" | "txt";
  readonly fileExtensions: readonly string[];
  readonly googleDriveFolderName: string;
  readonly autoSync: boolean;
  readonly syncOnSave: boolean;
}

export function getConfig(): DevNotesConfig {
  const cfg = vscode.workspace.getConfiguration("devNotes");
  const configuredExtensions = cfg
    .get<string>("fileExtensions", "md,txt,pdf")
    .split(",")
    .map((extension) => extension.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
  return {
    notesDirectory: cfg.get<string>("notesDirectory", "~/DevNotes"),
    defaultNoteExtension: cfg.get<"md" | "txt">("defaultNoteExtension", "md"),
    fileExtensions: configuredExtensions.length
      ? configuredExtensions
      : ["md", "txt", "pdf"],
    googleDriveFolderName: cfg.get<string>(
      "googleDriveFolderName",
      "Dev Notes",
    ),
    autoSync: cfg.get<boolean>("autoSync", true),
    syncOnSave: cfg.get<boolean>("syncOnSave", true),
  };
}
