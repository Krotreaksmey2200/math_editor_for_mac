' ==============================================================================
' Microsoft Word Add-in: MacTeX MathEditor Plugin Suite (Khmer Edition)
' ==============================================================================
Option Explicit

Public gAutoAlignEnabled As Boolean
Public gWordAppEvents As clsWordEvents

Public Sub AutoExec()
    On Error Resume Next
    Set gWordAppEvents = New clsWordEvents
    Set gWordAppEvents.App = Application
End Sub

Public Sub AutoOpen()
    On Error Resume Next
    AutoExec
End Sub

' ------------------------------------------------------------------------------
' RIBBON CALLBACK HANDLERS
' ------------------------------------------------------------------------------

' Main Button: បើក MacTeX MathEditor
Public Sub OpenMacTeXMathEditor(control As IRibbonControl)
    On Error GoTo ErrorHandler
    Dim result As String
    #If Mac Then
        result = AppleScriptTask("MacTeXMathEditor.scpt", "LaunchApp", "")
        If Err.Number <> 0 Or result = "" Then
            Err.Clear
            Dim scpt As String
            scpt = "tell application id ""com.heng.mactex-math-editor"" to activate" & vbCr & _
                   "do shell script ""open -b com.heng.mactex-math-editor 2>/dev/null || open -a mactex-math-editor 2>/dev/null || open '/Applications/mactex-math-editor.app' 2>/dev/null || true; curl -s -X POST http://127.0.0.1:45678/new-inline"""
            MacScript scpt
        End If
    #End If
    Exit Sub
ErrorHandler:
    MsgBox "មិនអាចបើក MacTeX MathEditor បានទេ: " & Err.Description, vbExclamation, "MathEditor"
End Sub

Public Sub OnOpenMathEditorClick(Optional control As Object)
    OpenMacTeXMathEditor Nothing
End Sub

Public Sub LaunchApp(Optional dummy As String)
    OpenMacTeXMathEditor Nothing
End Sub
