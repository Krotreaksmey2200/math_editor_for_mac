on LaunchApp(paramString)
    try
        tell application id "com.heng.mactex-math-editor"
            activate
        end tell
        return "Success"
    on error
        return "Error: Could not launch app"
    end try
end LaunchApp

on ToggleApp(paramString)
    try
        tell application "Microsoft Word"
            set mySel to selection
            set selTextObj to text object of mySel
            if (count of inline pictures of selTextObj) > 0 then
                set theShape to inline picture 1 of selTextObj
                set latexCode to alternative text of theShape
                if latexCode is not "" then
                    delete theShape
                    type text text latexCode
                    return "Success: Toggled Image to Text"
                end if
            end if
            
            -- If we got here, it's either text or an image without alt text
            set latexCode to content of text object of mySel
            if latexCode is not "" then
                set the clipboard to latexCode
                tell application id "com.heng.mactex-math-editor" to activate
                return "Success: Toggled Text to App"
            end if
            
            tell application id "com.heng.mactex-math-editor" to activate
            return "Success: Launched App"
        end tell
    on error errMsg
        return "Error: " & errMsg
    end try
end ToggleApp
