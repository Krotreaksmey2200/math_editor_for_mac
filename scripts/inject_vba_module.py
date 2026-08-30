import subprocess
import os
import zipfile

bas_content = '''Attribute VB_Name = "MathEditorPlugin"
Option Explicit

Public Sub AutoExec()
    On Error Resume Next
End Sub

Public Sub OnInlineEqClick(Optional control As Object)
    On Error Resume Next
    CallAppCommand "new-inline"
End Sub

Public Sub OnEditEquationClick(Optional control As Object)
    On Error Resume Next
    EditSelectedEquation
End Sub

Public Sub OnDisplayEqClick(Optional control As Object)
    On Error Resume Next
    CallAppCommand "new-display"
End Sub

Public Sub OnBaselineAlignClick(Optional control As Object)
    On Error Resume Next
    CallAppCommand "new-inline"
End Sub

Public Sub OnLeftNumberedEqClick(Optional control As Object)
    On Error Resume Next
    CallAppCommand "new-inline"
End Sub

Public Sub OnRightNumberedEqClick(Optional control As Object)
    On Error Resume Next
    CallAppCommand "new-inline"
End Sub

Public Sub OnInsertEqNumClick(Optional control As Object)
    On Error Resume Next
    CallAppCommand "new-inline"
End Sub

Public Sub OnInsertChapterBreakClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnInsertSectionBreakClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnInsertNextChapterBreakClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnInsertNextSectionBreakClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnModifyChapterBreakClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnModifySectionBreakClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnDeleteSectionBreakClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnToggleShowBreaksClick(Optional control As Object)
    On Error Resume Next
    ActiveWindow.View.ShowHiddenText = Not ActiveWindow.View.ShowHiddenText
End Sub

Public Sub OnUpdateNumFormatClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnUpdateAllNumbersClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnInsertEqRefClick(Optional control As Object)
    On Error Resume Next
End Sub

Public Sub OnAutoAlignToggle(Optional control As Object, Optional pressed As Boolean)
    On Error Resume Next
End Sub

Private Sub CallAppCommand(cmd As String)
    On Error Resume Next
    #If Mac Then
        Dim scpt As String
        scpt = "tell application ""mactex-math-editor"" to activate" & vbCr & _
               "do shell script ""open -a mactex-math-editor; curl -s -X POST http://127.0.0.1:45678/" & cmd & """"
        MacScript scpt
    #End If
End Sub

Private Sub EditSelectedEquation()
    On Error Resume Next
    #If Mac Then
        Dim scpt As String
        scpt = "tell application ""mactex-math-editor"" to activate" & vbCr & _
               "do shell script ""open -a mactex-math-editor; curl -s -X POST http://127.0.0.1:45678/edit"""
        MacScript scpt
    #End If
End Sub
'''

with open('word_addin_source/MathEditorPlugin.bas', 'w', encoding='utf-8') as f:
    f.write(bas_content)

print("✓ Updated MathEditorPlugin.bas with clean standalone macros")
