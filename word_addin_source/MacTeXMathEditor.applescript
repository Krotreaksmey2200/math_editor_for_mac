on ActivateApp()
	try
		tell application "mactex-math-editor" to activate
	end try
	try
		do shell script "open -a mactex-math-editor"
	end try
end ActivateApp

on SendLatexToEditor(jsonPayload)
	my ActivateApp()
	try
		do shell script "curl -s -X POST http://127.0.0.1:45678/edit -H 'Content-Type: application/json' -d " & quoted form of jsonPayload
	end try
end SendLatexToEditor

on CallAppCommand(cmd)
	my ActivateApp()
	try
		do shell script "curl -s -X POST http://127.0.0.1:45678/" & cmd
	end try
end CallAppCommand
