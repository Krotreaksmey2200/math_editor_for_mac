import subprocess
import os
import zipfile

# 1. Create a script to generate clean DOTM with VBA in Word
as_script = '''
tell application "Microsoft Word"
    activate
    set newDoc to make new document
    delay 1
    
    set vbaCode to "' MacTeX MathEditor Plugin Module" & linefeed & "Option Explicit" & linefeed & linefeed & "Public Sub AutoExec()" & linefeed & "    On Error Resume Next" & linefeed & "End Sub" & linefeed & linefeed & "Public Sub OnInlineEqClick(Optional control As Object)" & linefeed & "    On Error Resume Next" & linefeed & "    do shell script \"open -a mactex-math-editor; curl -s -X POST http://127.0.0.1:45678/new-inline\"" & linefeed & "End Sub" & linefeed & linefeed & "Public Sub OnEditEquationClick(Optional control As Object)" & linefeed & "    On Error Resume Next" & linefeed & "    do shell script \"open -a mactex-math-editor; curl -s -X POST http://127.0.0.1:45678/edit\"" & linefeed & "End Sub" & linefeed & linefeed & "Public Sub OnDisplayEqClick(Optional control As Object)" & linefeed & "    On Error Resume Next" & linefeed & "    do shell script \"open -a mactex-math-editor; curl -s -X POST http://127.0.0.1:45678/new-display\"" & linefeed & "End Sub"
    
    try
        set targetPath to (POSIX file "/Users/heng/Desktop/khme_mathedtor/mactex-math-editor/src-tauri/word_plugin/MacTeXMathEditorPlugin.dotm")
        save as newDoc file name targetPath file format template
        close newDoc saving no
        return "SUCCESS_SAVE_DOTM"
    on error err
        return "ERROR: " & err
    end try
end tell
'''

p = subprocess.run(['osascript', '-e', as_script], capture_output=True, text=True)
print("AppleScript Output:", p.stdout.strip())
