on ActivateApp()
	try
		tell application id "com.heng.mactex-math-editor" to activate
	on error
		try
			tell application "mactex-math-editor" to activate
		on error
			try
				do shell script "open -b com.heng.mactex-math-editor 2>/dev/null || open -a mactex-math-editor 2>/dev/null || open '/Applications/mactex-math-editor.app' 2>/dev/null || true"
			end try
		end try
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
