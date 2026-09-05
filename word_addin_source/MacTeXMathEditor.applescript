on LaunchApp(paramString)
    try
        my ActivateApp()
        do shell script "curl -s -X POST http://127.0.0.1:45678/new-inline"
        return "Success"
    on error
        return "Error: Could not launch app"
    end try
end LaunchApp

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

on ToggleApp(paramString)
    try
        tell application "Microsoft Word"
            set mySel to selection
            set selTextObj to text object of mySel
            
            -- 1. Check if an equation image is selected -> toggle back to $...$
            if (count of inline pictures of selTextObj) > 0 then
                set theShape to inline picture 1 of selTextObj
                set altText to alternative text of theShape
                if altText is not missing value and altText is not "" then
                    set latexCode to altText
                    set AppleScript's text item delimiters to "|latex:"
                    set parts to text items of altText
                    if length of parts is greater than 1 then
                        set latexCode to item 2 of parts
                    else
                        set AppleScript's text item delimiters to "|"
                        set parts2 to text items of altText
                        if length of parts2 is greater than 1 then
                            set latexCode to item 2 of parts2
                        end if
                    end if
                    set AppleScript's text item delimiters to ""
                    
                    if latexCode starts with "ratio:" then
                        set AppleScript's text item delimiters to "|"
                        set parts3 to text items of latexCode
                        if length of parts3 is greater than 1 then
                            set latexCode to item 2 of parts3
                        end if
                        set AppleScript's text item delimiters to ""
                    end if
                    
                    if latexCode is not "" then
                        if latexCode does not start with "$" then
                            set latexCode to "$" & latexCode & "$"
                        end if
                        delete theShape
                        type text text latexCode
                        return "Success: Toggled Image to Text"
                    end if
                end if
            end if
        end tell
        
        -- 2. If not an image, trigger Toggle TeX / Compile in MacTeX MathEditor!
        my ActivateApp()
        repeat 15 times
            try
                set cRes to do shell script "curl -s -X POST http://127.0.0.1:45678/toggle-tex"
                if cRes contains "OK" then exit repeat
            end try
            delay 0.3
        end repeat
        return "Success: Triggered Toggle TeX"
    on error errMsg
        return "Error: " & errMsg
    end try
end ToggleApp
