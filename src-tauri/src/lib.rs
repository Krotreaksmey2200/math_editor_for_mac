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

#[derive(Deserialize)]
struct EditPayload {
    latex: String,
}

async fn edit_handler(
    State(state): State<AppState>,
    Json(payload): Json<EditPayload>,
) -> impl IntoResponse {
    if let Some(app) = &state.app_handle {
        // Emit event to React
        let _ = app.emit("edit-equation", &payload.latex);
        
        // Bring app to front via AppleScript
        #[cfg(target_os = "macos")]
        {
            let _ = std::process::Command::new("osascript")
                .arg("-e")
                .arg("tell application \"mactex-math-editor\" to activate")
                .spawn();
        }
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

    let ns_png_data = make_nsdata(png_bytes);
    let _: bool = msg_send![pasteboard, setData:ns_png_data forType:type_png];

    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
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
        
        set_macos_clipboard(&svg, &image_bytes, &latex, &mathml, &final_html)?;
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
async fn insert_into_word(_latex: String, _is_svg: bool, ratio: f64) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(r#"
            tell application "Microsoft Word" to activate
            
            tell application "System Events"
                set waitCount to 0
                repeat while not (frontmost of process "Microsoft Word") and waitCount < 50
                    delay 0.1
                    set waitCount to waitCount + 1
                end repeat
            end tell
            
            tell application "Microsoft Word"
                set startPos to start of content of text object of selection
            end tell
            
            tell application "System Events"
                keystroke "v" using command down
            end tell
            
            tell application "Microsoft Word"
                set endPos to start of content of text object of selection
                set loopCount to 0
                repeat while endPos = startPos and loopCount < 100
                    delay 0.1
                    set endPos to start of content of text object of selection
                    set loopCount to loopCount + 1
                end repeat
                
                if endPos > startPos then
                    set picCount to count of inline pictures of active document
                    repeat with i from 1 to picCount
                        set theShape to inline picture i of active document
                        set shapeObj to text object of theShape
                        set shapeStart to start of content of shapeObj
                        if shapeStart >= startPos and shapeStart < endPos then
                            try
                                set ratioVal to (run script "{}")
                                set shapeHeight to height of theShape
                                set actual_depth to shapeHeight * ratioVal
                                set font position of font object of shapeObj to -actual_depth
                            on error
                            end try
                        end if
                    end repeat
                end if
            end tell
        "#, ratio);
        
        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet, 
            compile_math, 
            send_to_word,
            copy_to_clipboard,
            insert_into_word,
            align_word_equations,
            open_word,
            check_word_connection,
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
