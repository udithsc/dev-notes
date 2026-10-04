# Dev Notes

Dev Notes is a local-first VS Code extension for organizing developer notes as ordinary Markdown and text files. Notes open in VS Code's native editor and remain usable when the extension is not installed.

## Features

- Activity Bar view with folders and `.md`, `.txt`, and `.pdf` files.
- Creates the default `~/DevNotes` directory on activation.
- Creates, renames, deletes, refreshes, and opens local notes and folders.
- Watches the default and added directories for external file changes.
- Adds existing directories as extra roots in the Notes view; added roots persist across VS Code restarts.
- Opens Markdown and text files in VS Code; PDFs and other configured file types open with the system's default viewer.
- Ignores files other than Markdown, plain text, and PDF.

## Use

Open the **Dev Notes** Activity Bar view. Use **Dev Notes: Add Folder** in the view toolbar or Command Palette to add an existing directory, such as a folder in Documents. Each directory appears as its own top-level root, and the added-root list persists across VS Code restarts. Select a root or folder before creating a note or folder to create inside that location; with no selection, creation uses the default `~/DevNotes` root. Use **Remove Folder** from an added root's context menu to remove it from the view; this does not delete its files. The default root cannot be removed.

Select a Markdown or text note to open it in VS Code. Selecting a PDF opens it with the operating system's default PDF viewer. A note's context menu also provides rename, delete, and **Reveal in File Manager** actions. Deletion asks for confirmation and only removes the local item.

The Command Palette provides:

- `Dev Notes: New Note`
- `Dev Notes: New Folder`
- `Dev Notes: Add Folder`
- `Dev Notes: Rename`
- `Dev Notes: Delete`
- `Dev Notes: Refresh`
- `Dev Notes: Open Notes Folder`
- `Reveal in File Manager` (note context menu)
- `Dev Notes: Remove Folder` (added-root context menu)

## Configuration

Open **Preferences: Open Settings** and search for `@ext:local.dev-notes` to change Dev Notes settings:

- `devNotes.notesDirectory` sets the default local notes folder. It defaults to `~/DevNotes`; a leading `~/` expands to the current user's home directory. Reload VS Code after changing it.
- `devNotes.defaultNoteExtension` chooses the initially highlighted format for new notes (`md` or `txt`). The New Note picker still lets you choose the other format.
- `devNotes.fileExtensions` is a comma-separated list of file extensions shown in each Notes root, without dots. It defaults to `md,txt,pdf`; set it to `*` to show all files. Changes apply immediately.

Additional folders added with **Dev Notes: Add Folder** are managed separately from the default notes-directory setting.

The `devNotes.googleDriveFolderName`, `devNotes.autoSync`, and `devNotes.syncOnSave` settings are reserved for the planned Drive integration. Google authentication and synchronization are not implemented in this phase.

## Development

Requirements: Node.js and npm.

```sh
npm install
npm run compile
npm test
```

Press **F5** in VS Code to launch the Extension Development Host for development. That temporary host is separate from your regular VS Code window.

## Build and Install Locally

To use Dev Notes as a regular installed extension, build a VS Code extension package (VSIX):

```sh
npm install
npm run package:vsix
```

The command runs the production checks and creates `dev-notes-0.0.1.vsix` in the project directory. To install it from VS Code:

1. Open the Extensions view.
2. Open the Extensions view's **...** menu and choose **Install from VSIX...**.
3. Select `dev-notes-0.0.1.vsix`.
4. Reload VS Code if prompted, then open the Dev Notes Activity Bar view.

Alternatively, install it from a terminal with the VS Code command-line tool:

```sh
code --install-extension ./dev-notes-0.0.1.vsix
```

To update after rebuilding, install the new VSIX and reload VS Code. To remove the local install:

```sh
code --uninstall-extension local.dev-notes
```

The `local` publisher identifier and skipped repository/license checks are for local packaging only; this setup does not publish the extension to the Marketplace. Add the appropriate repository and license metadata before preparing a Marketplace release. Notes remain ordinary files in their configured folders, independently of whether the extension is installed. The extension does not use a database or custom editor.

## Current Scope

This development phase covers the extension foundation, local notes workflow, and local VSIX packaging. Google Drive authentication, remote file management, and conflict handling are planned follow-up work. No OAuth credentials or tokens are currently required.
