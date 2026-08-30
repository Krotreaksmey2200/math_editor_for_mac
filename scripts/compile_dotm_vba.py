import subprocess
import os
import zipfile

bas_path = os.path.abspath('word_addin_source/MathEditorPlugin.bas')
dotm_path = os.path.abspath('src-tauri/word_plugin/MacTeXMathEditorPlugin.dotm')
startup_dotm = os.path.expanduser('~/Library/Group Containers/UBF8T346G9.Office/User Content.localized/Startup.localized/Word/MacTeXMathEditorPlugin.dotm')

# Read full VBA code from MathEditorPlugin.bas
with open(bas_path, 'r', encoding='utf-8') as f:
    vba_code = f.read()

# AppleScript to open dotm in Word, insert VBA code into module, and save
as_script = f'''
tell application "Microsoft Word"
    activate
    set targetDoc to open file name "{dotm_path}"
    delay 1
    
    try
        -- Remove existing MathEditorPlugin module if present
        try
            do Visual Basic "On Error Resume Next: targetDoc.VBProject.VBComponents.Remove targetDoc.VBProject.VBComponents(\\"MathEditorPlugin\\")"
        end try
        
        -- Import new MathEditorPlugin.bas
        do Visual Basic "targetDoc.VBProject.VBComponents.Import \\"{bas_path}\\""
        
        save targetDoc
        close targetDoc
        return "SUCCESS_VBA_COMPILE"
    on error err
        try
            close targetDoc saving no
        end try
        return "ERROR: " & err
    end try
end tell
'''

p = subprocess.run(['osascript', '-e', as_script], capture_output=True, text=True)
print("Compiler Result:", p.stdout.strip(), p.stderr.strip())

# Check if OnOpenMathEditorClick is now present in vbaProject.bin
with zipfile.ZipFile(dotm_path, 'r') as z:
    vba_bytes = z.read('word/vbaProject.bin')
    print("✓ OnOpenMathEditorClick in compiled vbaProject.bin:", b'OnOpenMathEditorClick' in vba_bytes)
    print("✓ MathEditorPlugin in compiled vbaProject.bin:", b'MathEditorPlugin' in vba_bytes)
