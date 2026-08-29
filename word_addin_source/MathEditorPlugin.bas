' ==============================================================================
' Microsoft Word Add-in: MacTeX MathEditor Plugin
' ==============================================================================
Option Explicit

' ------------------------------------------------------------------------------
' RIBBON CALLBACK HANDLERS
' ------------------------------------------------------------------------------

Public Sub OnEditEquationClick(control As IRibbonControl)
    EditSelectedEquation
End Sub

' ------------------------------------------------------------------------------
' MACRO ENGINE
' ------------------------------------------------------------------------------

Public Sub EditSelectedEquation()
    On Error GoTo ErrorHandler
    
    Dim sel As Selection
    Set sel = Application.Selection
    
    ' Check if an inline shape is selected
    If sel.Type <> wdSelectionInlineShape Then
        MsgBox "Please select a MathEditor equation image to edit.", vbExclamation, "MathEditor"
        Exit Sub
    End If
    
    Dim shape As InlineShape
    Set shape = sel.InlineShapes(1)
    
    Dim altText As String
    altText = shape.AlternativeText
    
    ' The Alt Text format is "ratio:0.1234|%5Cfrac..."
    If InStr(altText, "ratio:") = 0 Or InStr(altText, "|") = 0 Then
        MsgBox "The selected image is not a valid MathEditor equation.", vbExclamation, "MathEditor"
        Exit Sub
    End If
    
    Dim parts() As String
    parts = Split(altText, "|")
    
    Dim rawLatex As String
    rawLatex = parts(1)
    
    ' Send POST request to Tauri App server (127.0.0.1:45678)
    SendLatexToServer rawLatex
    
    Exit Sub

ErrorHandler:
    MsgBox "Error communicating with MathEditor: " & Err.Description, vbCritical, "MathEditor"
End Sub

Private Sub SendLatexToServer(encodedLatex As String)
    Dim httpRequest As Object
    ' Note: MSXML2.XMLHTTP or MSXML2.XMLHTTP.6.0 is typically used on Windows.
    ' On Word for Mac, VBA support for XMLHTTP can be tricky.
    ' We can use AppleScript to make the curl request to bypass Mac VBA limitations.
    
    Dim appleScriptCode As String
    Dim jsonPayload As String
    
    ' Escape double quotes for the JSON payload
    jsonPayload = "{""latex"": """ & encodedLatex & """}"
    
    ' Create AppleScript to run curl
    appleScriptCode = "do shell script ""curl -X POST http://127.0.0.1:45678/edit " & _
                      "-H 'Content-Type: application/json' " & _
                      "-d '" & jsonPayload & "'"""
                      
    ' Execute the AppleScript
    MacScript (appleScriptCode)
    
End Sub
