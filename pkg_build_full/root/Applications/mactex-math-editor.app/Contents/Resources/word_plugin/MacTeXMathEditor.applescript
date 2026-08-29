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
