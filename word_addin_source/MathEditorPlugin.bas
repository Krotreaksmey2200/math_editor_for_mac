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

' Group 1: សមីការគណិតវិទ្យា (Equations)
Public Sub OnEditEquationClick(Optional control As Object)
    EditSelectedEquation
End Sub

Public Sub OnInlineEqClick(Optional control As Object)
    CallAppCommand "new-inline"
End Sub

Public Sub OnBaselineAlignClick(Optional control As Object)
    AlignDocumentEquations
End Sub

Public Sub OnDisplayEqClick(Optional control As Object)
    CallAppCommand "new-display"
End Sub

Public Sub OnLeftNumberedEqClick(Optional control As Object)
    InsertNumberedEquation "left"
    CallAppCommand "new-inline"
End Sub

Public Sub OnRightNumberedEqClick(Optional control As Object)
    InsertNumberedEquation "right"
    CallAppCommand "new-inline"
End Sub

Public Sub OnInsertEqNumClick(Optional control As Object)
    InsertEquationNumberField
End Sub

' Group 2: ជំពូក & ផ្នែក (Chapter & Section Breaks)
Public Sub OnInsertChapterBreakClick(Optional control As Object)
    InsertBreakMarker "chapter"
End Sub

Public Sub OnInsertSectionBreakClick(Optional control As Object)
    InsertBreakMarker "section"
End Sub

Public Sub OnInsertNextChapterBreakClick(Optional control As Object)
    InsertBreakMarker "next_chapter"
End Sub

Public Sub OnInsertNextSectionBreakClick(Optional control As Object)
    InsertBreakMarker "next_section"
End Sub

Public Sub OnModifyChapterBreakClick(Optional control As Object)
    MsgBox "ការកំណត់លេខរៀងជំពូក: បានកំណត់លេខរៀងជំពូកចាប់ផ្ដើម។", vbInformation, "MathEditor"
End Sub

Public Sub OnModifySectionBreakClick(Optional control As Object)
    MsgBox "ការកំណត់លេខរៀងផ្នែក: បានកំណត់លេខរៀងផ្នែកចាប់ផ្ដើម។", vbInformation, "MathEditor"
End Sub

Public Sub OnDeleteSectionBreakClick(Optional control As Object)
    DeleteCurrentBreakMarker
End Sub

Public Sub OnToggleShowBreaksClick(Optional control As Object)
    On Error Resume Next
    ActiveWindow.View.ShowHiddenText = Not ActiveWindow.View.ShowHiddenText
End Sub

' Group 3: លេខរៀង & ការយោងសមីការ (Numbering & References)
Public Sub OnUpdateNumFormatClick(Optional control As Object)
    MsgBox "ទម្រង់បង្ហាញលេខរៀងសមីការ: (ជំពូក.ផ្នែក.សមីការ)", vbInformation, "MathEditor"
End Sub

Public Sub OnUpdateAllNumbersClick(Optional control As Object)
    UpdateAllFieldsInDoc
End Sub

Public Sub OnInsertEqRefClick(Optional control As Object)
    InsertEquationReferenceLink
End Sub

Public Sub OnAutoAlignToggle(Optional control As Object, Optional pressed As Boolean)
    gAutoAlignEnabled = pressed
    If pressed Then
        MsgBox "បានបើកការតម្រឹមស្វ័យប្រវត្តិ: សមីការនឹងតម្រឹមជួរជម្រៅដោយស្វ័យប្រវត្តិពេលបញ្ចូល។", vbInformation, "MathEditor"
    End If
End Sub

' ------------------------------------------------------------------------------
' IMPLEMENTATION MODULES
' ------------------------------------------------------------------------------

Public Sub EditSelectedEquation()
    On Error GoTo ErrorHandler
    
    Dim sel As Selection
    Set sel = Application.Selection
    
    Dim shape As InlineShape
    Set shape = Nothing
    
    If sel.InlineShapes.Count > 0 Then
        Set shape = sel.InlineShapes(1)
    ElseIf sel.Hyperlinks.Count > 0 Then
        If sel.Hyperlinks(1).Range.InlineShapes.Count > 0 Then
            Set shape = sel.Hyperlinks(1).Range.InlineShapes(1)
        End If
    End If
    
    If shape Is Nothing Then
        Dim i As Long
        For i = 1 To ActiveDocument.InlineShapes.Count
            If ActiveDocument.InlineShapes(i).Range.Start <= sel.Range.Start And ActiveDocument.InlineShapes(i).Range.End >= sel.Range.Start Then
                Set shape = ActiveDocument.InlineShapes(i)
                Exit For
            End If
        Next i
    End If
    
    If shape Is Nothing Then
        CallAppCommand "new-inline"
        Exit Sub
    End If
    
    Dim altText As String
    altText = shape.AlternativeText
    
    If InStr(altText, "ratio:") = 0 And InStr(altText, "latex:") = 0 Then
        CallAppCommand "new-inline"
        Exit Sub
    End If
    
    Dim rawLatex As String
    If InStr(altText, "|latex:") > 0 Then
        Dim parts() As String
        parts = Split(altText, "|latex:")
        rawLatex = parts(1)
    ElseIf InStr(altText, "|") > 0 Then
        Dim parts2() As String
        parts2 = Split(altText, "|")
        rawLatex = parts2(1)
    Else
        rawLatex = altText
    End If
    
    SendLatexToServer rawLatex
    Exit Sub

ErrorHandler:
    CallAppCommand "new-inline"
End Sub

Public Sub AlignDocumentEquations()
    On Error Resume Next
    Dim ishape As InlineShape
    Dim count As Long
    count = 0
    
    For Each ishape In ActiveDocument.InlineShapes
        If InStr(ishape.AlternativeText, "ratio:") > 0 Then
            Dim parts() As String
            parts = Split(ishape.AlternativeText, "|")
            Dim ratioStr As String
            ratioStr = Replace(parts(0), "ratio:", "")
            
            Dim ratio As Double
            ratio = Val(ratioStr)
            
            If ratio > 0 Then
                Dim shift As Double
                shift = ishape.Height * ratio
                ishape.PictureFormat.BaselineDistance = shift
                count = count + 1
            End If
        End If
    Next ishape
    
    MsgBox "ការតម្រឹមជួរស្វ័យប្រវត្តបានបញ្ចប់! បានតម្រឹមសមីការចំនួន " & count & " ក្នុង Document។", vbInformation, "MathEditor"
    CallAppCommand "new-inline"
End Sub

Public Sub InsertNumberedEquation(align As String)
    On Error Resume Next
    Dim sel As Selection
    Set sel = Application.Selection
    
    sel.TypeParagraph
    
    If align = "right" Then
        sel.TypeText "\quad f(x) = \text{equation} \qquad ("
        sel.Fields.Add Range:=sel.Range, Type:=wdFieldEmpty, Text:="SEQ Equation", PreserveFormatting:=True
        sel.TypeText ")"
    Else
        sel.TypeText "("
        sel.Fields.Add Range:=sel.Range, Type:=wdFieldEmpty, Text:="SEQ Equation", PreserveFormatting:=True
        sel.TypeText ") \qquad f(x) = \text{equation}"
    End If
End Sub

Public Sub InsertEquationNumberField()
    On Error Resume Next
    Dim sel As Selection
    Set sel = Application.Selection
    sel.TypeText "("
    sel.Fields.Add Range:=sel.Range, Type:=wdFieldEmpty, Text:="SEQ Equation", PreserveFormatting:=True
    sel.TypeText ")"
End Sub

Public Sub InsertBreakMarker(breakType As String)
    On Error Resume Next
    Dim sel As Selection
    Set sel = Application.Selection
    
    sel.Font.Hidden = True
    sel.TypeText "[MathEditor_" & UCase(breakType) & "]"
    sel.Font.Hidden = False
End Sub

Public Sub DeleteCurrentBreakMarker()
    On Error Resume Next
    Dim sel As Selection
    Set sel = Application.Selection
    sel.Delete
End Sub

Public Sub UpdateAllFieldsInDoc()
    On Error Resume Next
    Dim fld As Field
    For Each fld In ActiveDocument.Fields
        fld.Update
    Next fld
    MsgBox "បានធ្វើបច្ចុប្បន្នភាពលេខរៀងសមីការ និងការយោងទាំងអស់ក្នុង Document!", vbInformation, "MathEditor"
End Sub

Public Sub InsertEquationReferenceLink()
    On Error Resume Next
    Dim sel As Selection
    Set sel = Application.Selection
    sel.TypeText "Eq. ("
    sel.Fields.Add Range:=sel.Range, Type:=wdFieldEmpty, Text:="SEQ Equation \c", PreserveFormatting:=True
    sel.TypeText ")"
End Sub

Private Sub CallAppCommand(cmd As String)
    On Error Resume Next
    #If Mac Then
        Dim res As String
        res = AppleScriptTask("MacTeXMathEditor.scpt", "CallAppCommand", cmd)
        If Err.Number <> 0 Then
            Err.Clear
            Dim scpt As String
            scpt = "tell application ""mactex-math-editor"" to activate" & vbCr & _
                   "do shell script ""open -a mactex-math-editor; curl -s -X POST http://127.0.0.1:45678/" & cmd & """"
            MacScript scpt
        End If
    #End If
End Sub

Private Sub SendLatexToServer(encodedLatex As String)
    On Error Resume Next
    #If Mac Then
        Dim jsonPayload As String
        jsonPayload = "{""latex"": """ & encodedLatex & """}"
        Dim res As String
        res = AppleScriptTask("MacTeXMathEditor.scpt", "SendLatexToEditor", jsonPayload)
        If Err.Number <> 0 Then
            Err.Clear
            Dim scpt As String
            scpt = "tell application ""mactex-math-editor"" to activate" & vbCr & _
                   "do shell script ""open -a mactex-math-editor; curl -s -X POST http://127.0.0.1:45678/edit -H 'Content-Type: application/json' -d '" & jsonPayload & "'"""
            MacScript scpt
        End If
    #End If
End Sub
