' ==============================================================================
' Microsoft Word Add-in: Tex Math Tools Ribbon Callbacks & Macro Logic
' ==============================================================================
Option Explicit

' ------------------------------------------------------------------------------
' RIBBON CALLBACK HANDLERS
' ------------------------------------------------------------------------------

' Callback for "Convert Selection" button
Public Sub OnConvertSelectionClick(control As IRibbonControl)
    ConvertLatexToWordMath_Selection
End Sub

' Callback for "Batch Convert All" button
Public Sub OnBatchConvertDocClick(control As IRibbonControl)
    BatchConvertAllLatexInDoc
End Sub


' ------------------------------------------------------------------------------
' CONVERSION MACRO ENGINE
' ------------------------------------------------------------------------------

''' <summary>
''' Subroutine 1: Convert selected LaTeX code to Native Word Inline OMML Equation
''' </summary>
Public Sub ConvertLatexToWordMath_Selection()
    On Error GoTo ErrorHandler
    
    Dim rng As Range
    Set rng = Selection.Range
    
    If rng.Start = rng.End Or Len(Trim(rng.Text)) = 0 Then
        MsgBox "Please select some LaTeX code first.", vbExclamation, "Tex Math Tools"
        Exit Sub
    End If
    
    Dim latexStr As String
    latexStr = Trim(rng.Text)
    
    ' Strip delimiters ($...$ or $$...$$)
    If Left(latexStr, 2) = "$$" And Right(latexStr, 2) = "$$" Then
        latexStr = Trim(Mid(latexStr, 3, Len(latexStr) - 4))
    ElseIf Left(latexStr, 1) = "$" And Right(latexStr, 1) = "$" Then
        latexStr = Trim(Mid(latexStr, 2, Len(latexStr) - 2))
    End If
    
    If Len(latexStr) = 0 Then Exit Sub
    
    Application.ScreenUpdating = False
    
    rng.Text = latexStr
    Dim oMathObj As OMath
    Set oMathObj = rng.OMaths.Add(rng)
    
    oMathObj.Type = wdOMathInline
    oMathObj.BuildUp
    
    Application.ScreenUpdating = True
    Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    MsgBox "Error converting selection: " & Err.Description, vbCritical, "Tex Math Tools"
End Sub


''' <summary>
''' Subroutine 2: Batch convert all LaTeX equations ($...$ and $$...$$) in the document
''' </summary>
Public Sub BatchConvertAllLatexInDoc()
    On Error GoTo ErrorHandler
    
    Dim doc As Document
    Set doc = ActiveDocument
    
    Application.ScreenUpdating = False
    
    Dim convertedCount As Long
    convertedCount = 0
    
    ' Pass 1: Convert $$...$$ (Double Dollar)
    convertedCount = convertedCount + ConvertLatexByPattern(doc, "\$\$([!$]@)\$\$", 2)
    
    ' Pass 2: Convert $...$ (Single Dollar)
    convertedCount = convertedCount + ConvertLatexByPattern(doc, "\$([!$]@)\$", 1)
    
    Application.ScreenUpdating = True
    
    If convertedCount > 0 Then
        MsgBox convertedCount & " LaTeX equation(s) successfully converted to Word Math!", _
               vbInformation, "Tex Math Tools"
    Else
        MsgBox "No LaTeX equations enclosed in $...$ or $$...$$ were found.", _
               vbInformation, "Tex Math Tools"
    End If
    
    Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    MsgBox "An error occurred during conversion: " & Err.Description, vbCritical, "Tex Math Tools"
End Sub


''' <summary>
''' Helper function for batch pattern replacement
''' </summary>
Private Function ConvertLatexByPattern(ByRef doc As Document, ByVal wildcardPattern As String, ByVal delimiterLen As Integer) As Long
    On Error Resume Next
    
    Dim searchRng As Range
    Set searchRng = doc.Content
    
    Dim count As Long
    count = 0
    
    With searchRng.Find
        .ClearFormatting
        .Text = wildcardPattern
        .MatchWildcards = True
        .Forward = True
        .Wrap = wdFindStop
        
        Do While .Execute
            Dim rawText As String
            rawText = searchRng.Text
            
            Dim cleanLatex As String
            cleanLatex = Trim(Mid(rawText, delimiterLen + 1, Len(rawText) - (delimiterLen * 2)))
            
            If Len(cleanLatex) > 0 Then
                searchRng.Text = cleanLatex
                
                Dim objOMath As OMath
                Set objOMath = searchRng.OMaths.Add(searchRng)
                
                If Not objOMath Is Nothing Then
                    objOMath.Type = wdOMathInline
                    objOMath.BuildUp
                    count = count + 1
                End If
            End If
            
            searchRng.Collapse wdCollapseEnd
            searchRng.End = doc.Content.End
        Loop
    End With
    
    ConvertLatexByPattern = count
End Function
