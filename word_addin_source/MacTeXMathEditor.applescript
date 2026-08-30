on SendLatexToEditor(jsonPayload)
	try
		do shell script "curl -X POST http://127.0.0.1:45678/edit -H 'Content-Type: application/json' -d " & quoted form of jsonPayload
	end try
end SendLatexToEditor

on CallAppCommand(cmd)
	try
		do shell script "curl -X POST http://127.0.0.1:45678/" & cmd
	end try
end CallAppCommand
