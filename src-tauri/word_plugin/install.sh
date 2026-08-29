#!/bin/bash

# Target directory for Word AppleScriptTask scripts
TARGET_DIR="$HOME/Library/Application Scripts/com.microsoft.Word"
# Target directory for Word Startup Add-ins
STARTUP_DIR="$HOME/Library/Group Containers/UBF8T346G9.Office/User Content.localized/Startup.localized/Word"

echo "Installing MacTeXMathEditor Word Plugin..."

# Create directories if they don't exist
mkdir -p "$TARGET_DIR"
mkdir -p "$STARTUP_DIR"

# Copy the compiled AppleScript
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp "$SCRIPT_DIR/MacTeXMathEditor.scpt" "$TARGET_DIR/"

# Copy the Word Add-in (DOTM)
cp "$SCRIPT_DIR/MacTeXMathEditorPlugin.dotm" "$STARTUP_DIR/"

echo "Successfully installed!"
echo "- AppleScript to $TARGET_DIR"
echo "- Plugin Add-in to $STARTUP_DIR"
echo "Please restart Microsoft Word to see the plugin."
