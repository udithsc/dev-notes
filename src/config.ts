import * as vscode from "vscode";

export interface DevNotesConfig {
  readonly notesDirectory: string;
  readonly googleDriveFolderName: string;
  readonly autoSync: boolean;
  readonly syncOnSave: boolean;
}

export function getConfig(): DevNotesConfig {
  const cfg = vscode.workspace.getConfiguration("devNotes");
  return {
    notesDirectory: cfg.get<string>("notesDirectory", "~/DevNotes"),
    googleDriveFolderName: cfg.get<string>(
      "googleDriveFolderName",
      "Dev Notes",
    ),
    autoSync: cfg.get<boolean>("autoSync", true),
    syncOnSave: cfg.get<boolean>("syncOnSave", true),
  };
}
