mod tex_engine;

use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use std::net::SocketAddr;
use tokio::sync::broadcast;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use crate::tex_engine::TeXOutput;
use futures_util::{StreamExt, SinkExt};

use axum::extract::Json;
use axum::routing::post;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<String>,
    pub app_handle: Option<tauri::AppHandle>,
}

use std::io::Write;
pub fn log_debug(msg: &str) {
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open("/tmp/mactex_debug.log") {
        let _ = writeln!(f, "[DEBUG] {}", msg);
    }
}

#[derive(Deserialize)]
struct EditPayload {
    latex: String,
}

fn activate_app_window(app: &tauri::AppHandle) {
    log_debug("activate_app_window called");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
    #[cfg(target_os = "macos")]
    unsafe {
        use objc::{msg_send, sel, sel_impl};
        if let Some(cls) = objc::runtime::Class::get("NSApplication") {
            let ns_app: *mut objc::runtime::Object = msg_send![cls, sharedApplication];
            if !ns_app.is_null() {
                let _: () = msg_send![ns_app, activateIgnoringOtherApps: true];
            }
        }
        let _ = std::process::Command::new("osascript")
            .arg("-e")
            .arg("tell application id \"com.heng.mactex-math-editor\" to activate")
            .spawn();
    }
}

async fn edit_handler(
    State(state): State<AppState>,
    Json(payload): Json<EditPayload>,
) -> impl IntoResponse {
    if let Some(app) = &state.app_handle {
        let _ = app.emit("edit-equation", &payload.latex);
        activate_app_window(app);
    }
    "OK"
}

async fn new_inline_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    if let Some(app) = &state.app_handle {
        let _ = app.emit("edit-equation", "");
        activate_app_window(app);
    }
    "OK"
}

async fn new_display_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    if let Some(app) = &state.app_handle {
        let _ = app.emit("edit-equation", "");
        activate_app_window(app);
    }
    "OK"
}

async fn toggle_tex_handler(
    State(state): State<AppState>,
) -> impl IntoResponse {
    log_debug("/toggle-tex HTTP request received");
    if let Some(app) = &state.app_handle {
        let windows = app.webview_windows();
        log_debug(&format!("Found {} webview window(s)", windows.len()));
        for (_label, window) in windows {
            let eval_res = window.eval("if (window.__triggerToggleTeX) { window.__triggerToggleTeX(); }");
            log_debug(&format!("window.eval result: {:?}", eval_res));
        }
        activate_app_window(app);
    } else {
        log_debug("state.app_handle is None in toggle_tex_handler!");
    }
    "OK"
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();
    
    tokio::select! {
        _ = async {
            while let Ok(msg_str) = rx.recv().await {
                if sender.send(Message::Text(msg_str.into())).await.is_err() {
                    break;
                }
            }
        } => {}
        _ = async {
            while let Some(msg_res) = receiver.next().await {
                if msg_res.is_err() {
                    break;
                }
            }
        } => {}
    }
}

async fn start_server(state: AppState) {
    let mut addin_path = std::env::current_dir().unwrap_or_default();
    if addin_path.ends_with("src-tauri") {
        addin_path = addin_path.parent().unwrap().to_path_buf();
    }
    let addin_dir = addin_path.join("addin");

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/edit", post(edit_handler))
        .route("/new-inline", post(new_inline_handler))
        .route("/new-display", post(new_display_handler))
        .route("/toggle-tex", post(toggle_tex_handler))
        .fallback_service(ServeDir::new(addin_dir))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 45678));
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind WebSocket server: {}", e);
            return;
        }
    };
    let _ = axum::serve(listener, app).await;
}

#[cfg(target_os = "macos")]
unsafe fn set_macos_clipboard(svg: &str, png_bytes: &[u8], latex: &str, mathml: &str, html: &str) -> Result<(), String> {
    use objc::{msg_send, sel, sel_impl};
    use objc::runtime::{Object, Class};
    use std::os::raw::c_void;

    // Get NSPasteboard class and generalPasteboard instance
    let nspasteboard_class = Class::get("NSPasteboard").ok_or("Failed to get NSPasteboard class")?;
    let pasteboard: *mut Object = msg_send![nspasteboard_class, generalPasteboard];
    if pasteboard.is_null() {
        return Err("Failed to get general pasteboard".to_string());
    }

    // Clear current clipboard contents
    let _: i64 = msg_send![pasteboard, clearContents];

    // Helper for creating NSString
    let nsstring_class = Class::get("NSString").ok_or("Failed to get NSString class")?;
    let make_nsstring = |s: &str| -> *mut Object {
        let bytes = s.as_ptr() as *const c_void;
        let alloc_str: *mut Object = msg_send![nsstring_class, alloc];
        let ns_str: *mut Object = msg_send![alloc_str, initWithBytes:bytes length:s.len() encoding:4]; // 4 = NSUTF8StringEncoding
        ns_str
    };

    // Helper for creating NSData
    let nsdata_class = Class::get("NSData").ok_or("Failed to get NSData class")?;
    let make_nsdata = |bytes: &[u8]| -> *mut Object {
        let ptr = bytes.as_ptr() as *const c_void;
        let alloc_data: *mut Object = msg_send![nsdata_class, alloc];
        let ns_data: *mut Object = msg_send![alloc_data, initWithBytes:ptr length:bytes.len()];
        ns_data
    };

    // Define standard cocoa clipboard types
    let type_string = make_nsstring("public.utf8-plain-text");
    let type_png = make_nsstring("public.png");
    let type_svg = make_nsstring("public.svg-image");
    let type_svg_xml = make_nsstring("image/svg+xml");
    let type_html = make_nsstring("public.html");

    // Put them in an NSArray for pasteboard declaration
    let nsarray_class = Class::get("NSArray").ok_or("Failed to get NSArray class")?;
    let has_html = !html.is_empty();
    let mut objects = vec![];
    if has_html {
        objects.push(type_html);
    }
    objects.push(type_svg_xml);
    objects.push(type_svg);
    objects.push(type_png);
    objects.push(type_string);
    let types_array: *mut Object = msg_send![nsarray_class, arrayWithObjects:objects.as_ptr() count:objects.len()];

    let _: i64 = msg_send![pasteboard, declareTypes:types_array owner:std::ptr::null_mut::<Object>()];

    // Set clipboard values for each type
    let ns_latex = make_nsstring(latex);
    let _: bool = msg_send![pasteboard, setString:ns_latex forType:type_string];

    let ns_svg_data = make_nsdata(svg.as_bytes());
    let _: bool = msg_send![pasteboard, setData:ns_svg_data forType:type_svg];
    let _: bool = msg_send![pasteboard, setData:ns_svg_data forType:type_svg_xml];

    if has_html {
        let ns_html = make_nsstring(html);
        let _: bool = msg_send![pasteboard, setString:ns_html forType:type_html];
    }

    if !png_bytes.is_empty() {
        let ns_png_data = make_nsdata(png_bytes);
        let _: bool = msg_send![pasteboard, setData:ns_png_data forType:type_png];
    }

    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    log_debug(&format!("JS invoke greet: {}", name));
    eprintln!("--> [JS-INVOKE] greet: {}", name);
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn compile_math(
    latex: String,
    eq_type: String,
    font_size: String,
    transparent: bool,
    preamble: String,
    latex_engine: String,
) -> Result<TeXOutput, String> {
    tex_engine::compile_latex_to_svg(&latex, &eq_type, &font_size, transparent, &preamble, &latex_engine)
}

#[tauri::command]
async fn send_to_word(output: TeXOutput, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let payload = serde_json::json!({
        "type": "insert_equation",
        "latex": output.svg,
        "base64_image": output.base64_image,
        "baseline_depth": output.baseline_depth,
        "width": output.width,
        "height": output.height,
        "mathml": output.mathml.unwrap_or_default()
    });
    
    let _ = state.tx.send(payload.to_string());
    Ok(())
}

#[tauri::command]
async fn copy_to_clipboard(
    svg: String,
    image_base64: String,
    is_svg: bool,
    latex: String,
    mathml: String,
    html: String,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    unsafe {
        use base64::{Engine as _, engine::general_purpose};
        // Clean base64 prefix if present
        let clean_b64 = image_base64.replace("data:image/png;base64,", "").replace("data:image/svg+xml;base64,", "");
        let image_bytes = general_purpose::STANDARD.decode(clean_b64.trim())
            .map_err(|e| format!("Failed to decode base64: {}", e))?;
            
        // Write the bytes to Documents (Word Sandbox allows this)
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/heng".to_string());
        let ext = if is_svg { "svg" } else { "png" };
        let tmp_path = format!("{}/Documents/.khme_equation_temp.{}", home, ext);
        std::fs::write(&tmp_path, &image_bytes).map_err(|e| format!("Failed to write temp image: {}", e))?;
        
        let final_html = html.replace("DATA_URI_PLACEHOLDER", &format!("file://{}", tmp_path));
        
        let png_data_to_pass = if is_svg { &[] } else { image_bytes.as_slice() };
        set_macos_clipboard(&svg, png_data_to_pass, &latex, &mathml, &final_html)?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|e| format!("Failed to open clipboard: {}", e))?;
        clipboard.set_text(latex)
            .map_err(|e| format!("Failed to set clipboard text: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn insert_into_word(latex: String, is_svg: bool, ratio: f64) -> Result<(), String> {
    let _ = is_svg;
    #[cfg(target_os = "macos")]
    {
        let script = format!(r#"
on run argv
    set latex_str to item 1 of argv
    
    tell application "Microsoft Word"
        activate
        set startPos to start of content of text object of selection
        paste object text object of selection
        
        -- Find the newly inserted picture at startPos
        set picCount to count of inline pictures of active document
        repeat with i from 1 to picCount
            set theShape to inline picture i of active document
            set shapeObj to text object of theShape
            if (start of content of shapeObj) = startPos then
                try
                    set ratioVal to (run script "{}")
                    set shapeHeight to height of theShape
                    set actual_depth to shapeHeight * ratioVal
                    set font position of font object of shapeObj to -actual_depth
                    set alternative text of theShape to "ratio:" & "{}" & "|latex:" & latex_str
                end try
                exit repeat
            end if
        end repeat
        
        -- Advance selection immediately after the inserted shape
        try
            set selRange to create range active document start (startPos + 1) end (startPos + 1)
            select selRange
        on error
            collapse range (text object of selection) direction collapse end
        end try
    end tell
end run
        "#, ratio, ratio);
        
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .arg(&latex)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;
            
        if !output.status.success() {
            let err_str = String::from_utf8_lossy(&output.stderr).to_string();
            println!("AppleScript error in insert: {}", err_str);
            return Err(format!("AppleScript failed: {}", err_str));
        }
    }
    Ok(())
}

#[tauri::command]
async fn toggle_tex_in_word() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                tell application "Microsoft Word"
                    set mySel to selection
                    set selTextObj to text object of mySel
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
                    return "NeedCompile"
                end tell
            on error errMsg
                return "Error: " & errMsg
            end try
        "#;
        
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;
            
        if !output.status.success() {
            let err_str = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("AppleScript failed: {}", err_str));
        }
        
        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(result);
    }
    #[cfg(not(target_os = "macos"))]
    Ok("Success: Not on macOS".into())
}

#[tauri::command]
async fn init_batch_compile() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                tell application "Microsoft Word"
                    set mySel to selection
                    set sP to start of content of text object of mySel
                    set eP to end of content of text object of mySel
                    if sP is equal to eP then
                        set curPara to paragraph 1 of text object of mySel
                        set sP to start of content of text object of curPara
                        set eP to end of content of text object of curPara
                    end if
                    set rngEnd to create range active document start eP end eP
                    if exists bookmark "MacTexBatchEnd" of active document then
                        delete bookmark "MacTexBatchEnd" of active document
                    end if
                    make new bookmark at active document with properties {name:"MacTexBatchEnd", text object:rngEnd}
                    set rngStart to create range active document start sP end sP
                    select rngStart
                    return "Success"
                end tell
            on error errMsg
                return "Error: " & errMsg
            end try
        "#;
        
        let output = std::process::Command::new("osascript")
            .arg("-e").arg(script).output().map_err(|e| format!("Failed: {}", e))?;
        if !output.status.success() { return Err("AppleScript failed".into()); }
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
    }
    #[cfg(not(target_os = "macos"))]
    Ok("Success".into())
}

#[tauri::command]
async fn finish_batch_compile() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                tell application "Microsoft Word"
                    if exists bookmark "MacTexBatchEnd" of active document then
                        delete bookmark "MacTexBatchEnd" of active document
                    end if
                    return "Success"
                end tell
            on error errMsg
                return "Error: " & errMsg
            end try
        "#;
        let _ = std::process::Command::new("osascript").arg("-e").arg(script).output();
        return Ok("Success".into());
    }
    #[cfg(not(target_os = "macos"))]
    Ok("Success".into())
}

#[tauri::command]
async fn find_next_math_in_word() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                tell application "Microsoft Word"
                    set myFind to find object of selection
                    clear formatting myFind
                    set match wildcards of myFind to true
                    set forward of myFind to true
                    set wrap of myFind to find stop
                    execute find myFind find text "\\${1,2}([!$]@)\\${1,2}"
                    
                    if found of myFind then
                        set foundStart to start of content of text object of selection
                        
                        if exists bookmark "MacTexBatchEnd" of active document then
                            set markStart to start of content of text object of bookmark "MacTexBatchEnd" of active document
                            if markStart is missing value then
                                set markStart to end of content of text object of active document
                            end if
                            if foundStart >= markStart then
                                delete bookmark "MacTexBatchEnd" of active document
                                return "DONE"
                            end if
                        end if
                        
                        set foundText to content of text object of selection
                        if foundText is missing value then
                            set foundText to ""
                        end if
                        return "SuccessText:" & foundText
                    end if
                    
                    if exists bookmark "MacTexBatchEnd" of active document then
                        delete bookmark "MacTexBatchEnd" of active document
                    end if
                    return "DONE"
                end tell
            on error errMsg
                return "Error: " & errMsg
            end try
        "#;
        
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;
            
        if !output.status.success() {
            let err_str = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("AppleScript failed: {}", err_str));
        }
        
        let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(result);
    }
    #[cfg(not(target_os = "macos"))]
    Ok("DONE".into())
}

#[tauri::command]
async fn skip_current_math_in_word() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            try
                tell application "Microsoft Word"
                    collapse range (text object of selection) direction collapse end
                end tell
            end try
        "#;
        let _ = std::process::Command::new("osascript").arg("-e").arg(script).output();
    }
    Ok(())
}

#[tauri::command]
async fn align_word_equations() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            tell application "Microsoft Word"
                activate
                set mySel to text object of selection
                set selStart to start of content of mySel
                set selEnd to end of content of mySel
                
                set hasSelection to false
                if selEnd > selStart then
                    set hasSelection to true
                end if
                
                set picCount to count of inline pictures of active document
                repeat with i from 1 to picCount
                    set theShape to inline picture i of active document
                    
                    set processShape to true
                    if hasSelection then
                        set shapeObj to text object of theShape
                        set shapeStart to start of content of shapeObj
                        if shapeStart < selStart or shapeStart >= selEnd then
                            set processShape to false
                        end if
                    end if
                    
                    if processShape then
                        set altText to alternative text of theShape
                        if altText is not missing value then
                            set isRatio to false
                            set isDepth to false
                            if altText starts with "ratio:" then
                                set isRatio to true
                            else if altText starts with "depth:" then
                                set isDepth to true
                            end if
                            
                            if isRatio or isDepth then
                                set AppleScript's text item delimiters to "|"
                                set parts to text items of altText
                                if length of parts is greater than 0 then
                                    set depthStr to item 1 of parts
                                    set AppleScript's text item delimiters to ":"
                                    set depthParts to text items of depthStr
                                    if length of depthParts is 2 then
                                        set valStr to item 2 of depthParts
                                        try
                                            set numericVal to (run script valStr)
                                            if isRatio then
                                                set shapeHeight to height of theShape
                                                set actual_depth to shapeHeight * numericVal
                                            else
                                                set s_h to inline shape scale height of theShape
                                                set actual_depth to numericVal * (s_h / 100.0)
                                            end if
                                            set font position of font object of text object of theShape to -actual_depth
                                        on error
                                        end try
                                    end if
                                end if
                                set AppleScript's text item delimiters to ""
                            end if
                        end if
                    end if
                end repeat
            end tell
        "#;
        
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;
            
        if !output.status.success() {
            let err_str = String::from_utf8_lossy(&output.stderr).to_string();
            println!("AppleScript error: {}", err_str);
            return Err(format!("AppleScript failed: {}", err_str));
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn open_word() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-a")
            .arg("Microsoft Word")
            .spawn()
            .map_err(|e| format!("Failed to launch Microsoft Word: {}", e))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(&["/C", "start", "winword"])
            .spawn()
            .map_err(|e| format!("Failed to launch Microsoft Word: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
async fn check_word_connection() -> Result<bool, String> {
    eprintln!("--> [RUST] check_word_connection called from JS!");
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            tell application "System Events"
                if exists (processes where name is "Microsoft Word") then
                    return "true"
                else
                    return "false"
                end if
            end tell
        "#;
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;
            
        let out_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(out_str == "true")
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[tauri::command]
async fn get_tex_paths() -> Result<tex_engine::TeXPathsInfo, String> {
    Ok(tex_engine::get_system_tex_paths())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            log_debug("Tauri setup starting...");
            let app_handle = app.handle().clone();
            let (tx, _rx) = broadcast::channel::<String>(100);
            let state = AppState { 
                tx, 
                app_handle: Some(app_handle) 
            };
            
            app.manage(state.clone());
            
            tauri::async_runtime::spawn(async move {
                start_server(state).await;
            });
            log_debug("Tauri setup finished.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            compile_math, 
            send_to_word,
            copy_to_clipboard,
            insert_into_word,
            align_word_equations,
            init_batch_compile,
            finish_batch_compile,
            find_next_math_in_word,
            skip_current_math_in_word,
            open_word,
            check_word_connection,
            toggle_tex_in_word,

            get_tex_paths,
            align_all_word_equations
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
#[tauri::command]
async fn align_all_word_equations() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            tell application "Microsoft Word"
                activate
                set picCount to count of inline pictures of active document
                set alignedCount to 0
                repeat with i from 1 to picCount
                    set theShape to inline picture i of active document
                    
                    set altText to alternative text of theShape
                    if altText is not missing value then
                        set isRatio to false
                        set isDepth to false
                        if altText starts with "ratio:" then
                            set isRatio to true
                        else if altText starts with "depth:" then
                            set isDepth to true
                        end if
                        
                        if isRatio or isDepth then
                            set AppleScript's text item delimiters to "|"
                            set parts to text items of altText
                            if length of parts is greater than 0 then
                                set depthStr to item 1 of parts
                                set AppleScript's text item delimiters to ":"
                                set depthParts to text items of depthStr
                                if length of depthParts is 2 then
                                    set valStr to item 2 of depthParts
                                    try
                                        set numericVal to (run script valStr)
                                        if isRatio then
                                            set shapeHeight to height of theShape
                                            set actual_depth to shapeHeight * numericVal
                                        else
                                            set s_h to inline shape scale height of theShape
                                            set actual_depth to numericVal * (s_h / 100.0)
                                        end if
                                        set font position of font object of text object of theShape to -actual_depth
                                        set alignedCount to alignedCount + 1
                                    on error
                                    end try
                                end if
                            end if
                            set AppleScript's text item delimiters to ""
                        end if
                    end if
                end repeat
                return alignedCount
            end tell
        "#;
        
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;
            
        if !output.status.success() {
            let err_str = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("AppleScript failed: {}", err_str));
        }
        
        let count_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok(count_str);
    }
    
    #[cfg(not(target_os = "macos"))]
    Ok("0".to_string())
}
