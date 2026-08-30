VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "clsWordEvents"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Option Explicit

Public WithEvents App As Word.Application

Private Sub App_WindowSelectionChange(ByVal Sel As Selection)
    On Error Resume Next
    If Sel.InlineShapes.Count > 0 Then
        Dim shp As InlineShape
        Set shp = Sel.InlineShapes(1)
        If InStr(shp.AlternativeText, "ratio:") > 0 Or InStr(shp.AlternativeText, "latex:") > 0 Then
            EditSelectedEquation
        End If
    End If
End Sub
