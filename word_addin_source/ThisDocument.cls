VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisDocument"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

' ==============================================================================
' Global Word Event Listener for Double-Click Equation Editing
' ==============================================================================
Private WithEvents AppEvents As Word.Application

Private Sub Document_Open()
    Set AppEvents = Word.Application
End Sub

Private Sub Document_New()
    Set AppEvents = Word.Application
End Sub

Private Sub AppEvents_WindowSelectionChange(ByVal Sel As Selection)
    On Error Resume Next
    If Sel.InlineShapes.Count = 1 Then
        Dim shp As InlineShape
        Set shp = Sel.InlineShapes(1)
        If InStr(shp.AlternativeText, "ratio:") > 0 Then
            ' Automatically trigger double-click equation edit when equation image is clicked
            EditSelectedEquation
        End If
    End If
End Sub
