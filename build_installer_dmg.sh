#!/bin/bash
set -e

echo "=== Building MacTeX MathEditor Full Installer DMG v1.1.0 ==="

# 1. Ensure production app is built
npm run tauri build

# 2. Build standalone PKG installer
PKG_ROOT="/tmp/pkg_plugin_root"
PKG_SCRIPTS="/tmp/pkg_plugin_scripts"
rm -rf "$PKG_ROOT" "$PKG_SCRIPTS"
mkdir -p "$PKG_ROOT/private/tmp/word_plugin_temp"
mkdir -p "$PKG_SCRIPTS"

cp "src-tauri/word_plugin/MacTeXMathEditorPlugin.dotm" "$PKG_ROOT/private/tmp/word_plugin_temp/"
cp "src-tauri/word_plugin/MacTeXMathEditor.scpt" "$PKG_ROOT/private/tmp/word_plugin_temp/"

cat << 'EOF' > "$PKG_SCRIPTS/postinstall"
#!/bin/bash
CURRENT_USER=$(stat -f %Su /dev/console)
USER_HOME=$(dscl . -read /Users/"$CURRENT_USER" NFSHomeDirectory | awk '{print $2}')
if [ -z "$USER_HOME" ]; then
    USER_HOME="/Users/$CURRENT_USER"
fi

PLUGIN_SRC="/private/tmp/word_plugin_temp"
TARGET_APPLESCRIPT_DIR="$USER_HOME/Library/Application Scripts/com.microsoft.Word"
TARGET_STARTUP_DIR="$USER_HOME/Library/Group Containers/UBF8T346G9.Office/User Content.localized/Startup.localized/Word"

mkdir -p "$TARGET_APPLESCRIPT_DIR" "$TARGET_STARTUP_DIR"
chown "$CURRENT_USER" "$TARGET_APPLESCRIPT_DIR" "$TARGET_STARTUP_DIR" 2>/dev/null || true

if [ -f "$PLUGIN_SRC/MacTeXMathEditor.scpt" ]; then
    cp "$PLUGIN_SRC/MacTeXMathEditor.scpt" "$TARGET_APPLESCRIPT_DIR/"
    chown "$CURRENT_USER" "$TARGET_APPLESCRIPT_DIR/MacTeXMathEditor.scpt" 2>/dev/null || true
    chmod 755 "$TARGET_APPLESCRIPT_DIR/MacTeXMathEditor.scpt"
fi

if [ -f "$PLUGIN_SRC/MacTeXMathEditorPlugin.dotm" ]; then
    cp "$PLUGIN_SRC/MacTeXMathEditorPlugin.dotm" "$TARGET_STARTUP_DIR/"
    chown "$CURRENT_USER" "$TARGET_STARTUP_DIR/MacTeXMathEditorPlugin.dotm" 2>/dev/null || true
    chmod 644 "$TARGET_STARTUP_DIR/MacTeXMathEditorPlugin.dotm"
fi

rm -rf "$PLUGIN_SRC"
exit 0
EOF

chmod +x "$PKG_SCRIPTS/postinstall"
mkdir -p "../installers"
PKG_OUTPUT="../installers/Install_Word_Plugin_v1.1.0.pkg"

pkgbuild --root "$PKG_ROOT" \
         --scripts "$PKG_SCRIPTS" \
         --identifier "com.heng.mactex-math-editor.plugin" \
         --version "1.1.0" \
         "$PKG_OUTPUT"

rm -rf "$PKG_ROOT" "$PKG_SCRIPTS"

# 3. Setup temporary DMG staging folder
STAGING_DIR="target/dmg_staging"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

APP_PATH="src-tauri/target/release/bundle/macos/mactex-math-editor.app"

if [ ! -d "$APP_PATH" ]; then
    echo "Error: $APP_PATH not found."
    exit 1
fi

echo "Copying App to staging..."
cp -R "$APP_PATH" "$STAGING_DIR/"

echo "Copying PKG Installer to staging..."
cp "$PKG_OUTPUT" "$STAGING_DIR/Install Word Plugin.pkg"

echo "Creating Applications symlink..."
ln -s /Applications "$STAGING_DIR/Applications"

OUTPUT_DMG="../installers/MacTeXMathEditor_Full_Installer_v1.1.0.dmg"
rm -f "$OUTPUT_DMG"

echo "Packaging into DMG..."
hdiutil create -volname "MacTeX MathEditor Installer v1.1.0" -srcfolder "$STAGING_DIR" -ov -format UDZO "$OUTPUT_DMG"
rm -rf "$STAGING_DIR"

echo "=== Build Complete! DMG saved at: $OUTPUT_DMG ==="
