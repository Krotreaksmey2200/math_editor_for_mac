tell application "Microsoft Word"
	activate
	open file name "/Users/heng/Desktop/khme_mathedtor/mactex-math-editor/src-tauri/word_plugin/MacTeXMathEditorPlugin.dotm"
	delay 1
	try
		do Visual Basic "Application.VBE.ActiveVBProject.VBComponents.Import \"/Users/heng/Desktop/khme_mathedtor/mactex-math-editor/word_addin_source/MathEditorPlugin.bas\""
		do Visual Basic "Application.VBE.ActiveVBProject.VBComponents.Import \"/Users/heng/Desktop/khme_mathedtor/mactex-math-editor/word_addin_source/clsWordEvents.cls\""
	on error err
		display dialog err
	end try
	save active document
	close active document
end tell
