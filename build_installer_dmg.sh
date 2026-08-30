#!/bin/bash
set -e

echo "=== Building MacTeX MathEditor Full Installer DMG ==="

# 1. Ensure production app is built
npm run tauri build

# 2. Setup temporary DMG staging folder
STAGING_DIR="target/dmg_staging"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

APP_PATH="src-tauri/target/release/bundle/macos/mactex-math-editor.app"
DOTM_PATH="src-tauri/word_plugin/MacTeXMathEditorPlugin.dotm"

if [ ! -d "$APP_PATH" ]; then
    echo "Error: $APP_PATH not found."
    exit 1
fi

echo "Copying App to staging..."
cp -R "$APP_PATH" "$STAGING_DIR/"

echo "Copying Word Plugin (.dotm) to staging..."
cp "$DOTM_PATH" "$STAGING_DIR/MacTeXMathEditorPlugin.dotm"

echo "Creating Applications symlink..."
ln -s /Applications "$STAGING_DIR/Applications"

echo "Creating Install Word Plugin script..."
cat << 'CMD_EOF' > "$STAGING_DIR/Install Word Plugin.command"
#!/bin/bash
echo "=================================================="
echo "  Installing MacTeX MathEditor Word Plugin..."
echo "=================================================="

WORD_SCRIPT_DIR="$HOME/Library/Application Scripts/com.microsoft.Word"
WORD_STARTUP_DIR="$HOME/Library/Group Containers/UBF8T346G9.Office/User Content.localized/Startup.localized/Word"

mkdir -p "$WORD_SCRIPT_DIR"
mkdir -p "$WORD_STARTUP_DIR"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ -f "$DIR/MacTeXMathEditorPlugin.dotm" ]; then
    cp "$DIR/MacTeXMathEditorPlugin.dotm" "$WORD_STARTUP_DIR/"
    echo "✓ Installed Word Add-in (DOTM) successfully."
fi

if [ -f "$DIR/mactex-math-editor.app/Contents/Resources/word_plugin/MacTeXMathEditor.scpt" ]; then
    cp "$DIR/mactex-math-editor.app/Contents/Resources/word_plugin/MacTeXMathEditor.scpt" "$WORD_SCRIPT_DIR/"
    echo "✓ Installed AppleScript Bridge successfully."
fi

echo ""
echo "=================================================="
echo " SUCCESS! Plugin installed for Microsoft Word."
echo " Please restart Microsoft Word to use MacTeX MathEditor."
echo "=================================================="
CMD_EOF

chmod +x "$STAGING_DIR/Install Word Plugin.command"

OUTPUT_DMG="../installers/MacTeXMathEditor_Full_Installer_v1.0.0.dmg"
mkdir -p "../installers"
rm -f "$OUTPUT_DMG"

echo "Packaging into DMG..."
hdiutil create -volname "MacTeX MathEditor Installer" -srcfolder "$STAGING_DIR" -ov -format UDZO "$OUTPUT_DMG"

rm -rf "$STAGING_DIR"

echo "=== Build Complete! DMG saved at: $OUTPUT_DMG ==="
