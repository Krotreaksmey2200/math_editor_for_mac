tell application "Microsoft Word"
	activate
	set docPath to "/Users/heng/Desktop/khme_mathedtor/mactex-math-editor/src-tauri/word_plugin/MacTeXMathEditorPlugin.dotm"
	set basPath to "/Users/heng/Desktop/khme_mathedtor/mactex-math-editor/word_addin_source/MathEditorPlugin.bas"
	
	open file name docPath
	delay 1
	set activeDoc to active document
	
	try
		do Visual Basic "On Error Resume Next: Application.VBE.ActiveVBProject.VBComponents.Import \"" & basPath & "\""
	end try
	
	save activeDoc
	close activeDoc
end tell
