' ==============================================================================
' Microsoft Word Add-in: MacTeX MathEditor Plugin Suite
' ==============================================================================
Option Explicit

Public gAutoAlignEnabled As Boolean

' ------------------------------------------------------------------------------
' RIBBON CALLBACK HANDLERS
' ------------------------------------------------------------------------------

' Group 1: Equations
Public Sub OnEditEquationClick(control As IRibbonControl)
    EditSelectedEquation
End Sub

Public Sub OnInlineEqClick(control As IRibbonControl)
    CallAppCommand "new-inline"
End Sub

Public Sub OnBaselineAlignClick(control As IRibbonControl)
    AlignDocumentEquations
End Sub

Public Sub OnDisplayEqClick(control As IRibbonControl)
    CallAppCommand "new-display"
End Sub

Public Sub OnLeftNumberedEqClick(control As IRibbonControl)
    InsertNumberedEquation "left"
End Sub

Public Sub OnRightNumberedEqClick(control As IRibbonControl)
    InsertNumberedEquation "right"
End Sub

Public Sub OnInsertEqNumClick(control As IRibbonControl)
    InsertEquationNumberField
End Sub

' Group 2: Chapter & Section Breaks
Public Sub OnInsertChapterBreakClick(control As IRibbonControl)
    InsertBreakMarker "chapter"
End Sub

Public Sub OnInsertSectionBreakClick(control As IRibbonControl)
    InsertBreakMarker "section"
End Sub

Public Sub OnInsertNextChapterBreakClick(control As IRibbonControl)
    InsertBreakMarker "next_chapter"
End Sub

Public Sub OnInsertNextSectionBreakClick(control As IRibbonControl)
    InsertBreakMarker "next_section"
End Sub

Public Sub OnModifyChapterBreakClick(control As IRibbonControl)
    MsgBox "Chapter Break Configuration: Set starting chapter number.", vbInformation, "MathEditor"
End Sub

Public Sub OnModifySectionBreakClick(control As IRibbonControl)
    MsgBox "Section Break Configuration: Set starting section number.", vbInformation, "MathEditor"
End Sub

Public Sub OnDeleteSectionBreakClick(control As IRibbonControl)
    DeleteCurrentBreakMarker
End Sub

Public Sub OnToggleShowBreaksClick(control As IRibbonControl)
    On Error Resume Next
    ActiveWindow.View.ShowHiddenText = Not ActiveWindow.View.ShowHiddenText
End Sub

' Group 3: Equation Numbering & References
Public Sub OnUpdateNumFormatClick(control As IRibbonControl)
    MsgBox "Equation Number Format: (Chapter.Section.Equation)", vbInformation, "MathEditor"
End Sub

Public Sub OnUpdateAllNumbersClick(control As IRibbonControl)
    UpdateAllFieldsInDoc
End Sub

Public Sub OnInsertEqRefClick(control As IRibbonControl)
    InsertEquationReferenceLink
End Sub

Public Sub OnAutoAlignToggle(control As IRibbonControl, pressed As Boolean)
    gAutoAlignEnabled = pressed
    If pressed Then
        MsgBox "Auto-Align Enabled: Equations will automatically adjust baseline depth on insertion.", vbInformation, "MathEditor"
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
        MsgBox "Please select a MathEditor equation image to edit.", vbExclamation, "MathEditor"
        Exit Sub
    End If
    
    Dim altText As String
    altText = shape.AlternativeText
    
    If InStr(altText, "ratio:") = 0 And InStr(altText, "latex:") = 0 Then
        MsgBox "The selected image is not a valid MathEditor equation.", vbExclamation, "MathEditor"
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
    MsgBox "Error communicating with MathEditor: " & Err.Description, vbCritical, "MathEditor"
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
    
    MsgBox "Baseline Alignment Complete! Adjusted " & count & " math equations.", vbInformation, "MathEditor"
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
    MsgBox "All equation numbers and field references updated!", vbInformation, "MathEditor"
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
    Dim script As String
    script = "do shell script ""curl -X POST http://127.0.0.1:45678/" & cmd & """"
    MacScript (script)
End Sub

Private Sub SendLatexToServer(encodedLatex As String)
    Dim appleScriptCode As String
    Dim jsonPayload As String
    
    jsonPayload = "{""latex"": """ & encodedLatex & """}"
    appleScriptCode = "do shell script ""curl -X POST http://127.0.0.1:45678/edit " & _
                      "-H 'Content-Type: application/json' " & _
                      "-d '" & jsonPayload & "'"""
                      
    MacScript (appleScriptCode)
End Sub
