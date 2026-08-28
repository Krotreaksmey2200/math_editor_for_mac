import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "mathlive"; // Imports the <math-field> web component
import { mathTypeRow1, mathTypeRow2, mathTypeTabs, mathTypeTabItems, MathTypePalette } from "./mathTypeData";
import { CheckCircle, AlertCircle, Send, ExternalLink } from "lucide-react";
import "./App.css";

interface TeXOutput {
  svg: string;
  base64_image: string; // Base64 of SVG
  png_base64?: string | null; // Actual PNG base64
  baseline_depth: number;
  width: number;
  height: number;
}

function PaletteButton({ palette, onInsert }: { palette: MathTypePalette, onInsert: (tex: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const cols = palette.items.length > 8 ? 4 : palette.items.length > 4 ? 3 : 2;

  return (
    <div className="relative inline-block" ref={buttonRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-[1px] hover:bg-[#d6e4f3] border transition-none cursor-default min-w-[28px] flex items-center justify-center ${isOpen ? 'bg-[#c5dff6] border-[#8cb0d8]' : 'border-transparent hover:border-[#8cb0d8]'}`}
        title={palette.tooltip}
      >
        <img src={`/src/assets/mathtype/${palette.image}`} alt={palette.tooltip} className="h-[22px] w-auto pointer-events-none opacity-90" />
      </button>
      
      {isOpen && palette.items.length > 0 && (
        <div className="absolute top-full left-0 mt-[1px] bg-white border border-[#999999] shadow-[2px_2px_4px_rgba(0,0,0,0.2)] p-[1px] z-[100] w-max grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(26px, 1fr))` }}>
          {palette.items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onInsert(item.snippet);
                setIsOpen(false);
              }}
              className="p-[1px] hover:bg-[#d6e4f3] text-center text-sm font-math min-h-[26px] border border-transparent hover:border-[#8cb0d8] flex items-center justify-center bg-transparent text-black"
              title={item.snippet}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [latex, setLatex] = useState<string>("f(x) = \\frac{ax^3 + bx^2 + 4}{x - 2}");
  const [activeMathTypeTab, setActiveMathTypeTab] = useState<string>("Algebra");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string>("");
  const [baselineEnabled, setBaselineEnabled] = useState<boolean>(true);
  const [wordConnected, setWordConnected] = useState<boolean>(false);
  
  const mathFieldRef = useRef<any>(null);

  // Setup MathLive
  useEffect(() => {
    const mf = mathFieldRef.current;
    if (mf) {
      mf.value = latex;
      
      // MathLive configuration for MathType-like behavior
      mf.mathVirtualKeyboardPolicy = "manual";
      mf.smartFence = true;
      mf.smartSuperscript = true;
      
      const handleInput = () => setLatex(mf.value);
      mf.addEventListener("input", handleInput);
      return () => mf.removeEventListener("input", handleInput);
    }
  }, []);

  // Listen for VBA Double-Click Edit Events from Rust
  useEffect(() => {
    const unlisten = listen<string>("edit-equation", (event) => {
      const decodedLatex = decodeURIComponent(event.payload);
      setLatex(decodedLatex);
      if (mathFieldRef.current) {
        mathFieldRef.current.value = decodedLatex;
      }
      showToast("Equation loaded from Word!");
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // Check Word connection periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await invoke<boolean>("check_word_connection");
        setWordConnected(isConnected);
      } catch (e) {
        setWordConnected(false);
      }
    };
    
    // Check immediately, then every 3 seconds
    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  };

  const insertLatex = (tex: string) => {
    if (mathFieldRef.current) {
      mathFieldRef.current.executeCommand(["insert", tex]);
      mathFieldRef.current.focus();
    }
  };

  // Compile using MacTeX TeX Engine
  const handleCompileAndCopy = async () => {
    setIsCompiling(true);
    setCompileError("");
    try {
      // 1. Compile DVI to SVG/PNG
      const result: TeXOutput = await invoke("compile_math", {
        latex: `\\displaystyle ${latex}`,
        eqType: "inline",
        fontSize: "12pt",
        transparent: true,
        preamble: ""
      });
      
      // Determine if we have a real PNG or if we fallback to SVG
      const hasRealPng = !!result.png_base64;
      const imageBase64 = hasRealPng ? result.png_base64 : result.base64_image;
      const isSvg = !hasRealPng;
      
      const depth = result.baseline_depth.toFixed(2);
      const ext = isSvg ? "svg" : "png";
      const mime = isSvg ? "image/svg+xml" : "image/png";
      const latexUri = encodeURIComponent(latex);
      
      const ratio = (result.baseline_depth / result.height).toFixed(4);
      const appliedRatio = baselineEnabled ? parseFloat(ratio) : 0.0;
      
      const styleString = baselineEnabled 
        ? `width: ${result.width}pt; height: ${result.height}pt; vertical-align: -${depth}pt;` 
        : `width: ${result.width}pt; height: ${result.height}pt;`;

      const htmlPayload = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<!--StartFragment-->
<img src="DATA_URI_PLACEHOLDER" alt="ratio:${ratio}|${latexUri}" width="${result.width}" height="${result.height}" style="${styleString}" />
<!--EndFragment-->
</body>
</html>`;

      // 3. Send to macOS Clipboard
      await invoke("copy_to_clipboard", {
        svg: result.svg,
        imageBase64: imageBase64,
        isSvg: isSvg,
        latex: latex,
        mathml: "", // We could extract MathML from mathlive if needed!
        html: htmlPayload
      });
      
      // 4. Automatically switch to Word and Paste!
      await invoke("insert_into_word", { latex: latex, isSvg: isSvg, ratio: appliedRatio });
      
      showToast("Equation copied to Word!");
    } catch (err: any) {
      setCompileError(err.message || "Compilation failed.");
      showToast("Error copying to Word.");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCopyOnly = async () => {
    setIsCompiling(true);
    setCompileError("");
    try {
      const result: TeXOutput = await invoke("compile_math", {
        latex: `\\displaystyle ${latex}`,
        eqType: "inline",
        fontSize: "12pt",
        transparent: true,
        preamble: ""
      });
      
      const hasRealPng = !!result.png_base64;
      const imageBase64 = hasRealPng ? result.png_base64 : result.base64_image;
      const isSvg = !hasRealPng;
      
      const depth = result.baseline_depth.toFixed(2);
      const heightVal = result.height;
      const ratio = (result.baseline_depth / heightVal).toFixed(4);
      
      const styleString = baselineEnabled 
        ? `width: ${result.width}pt; height: ${result.height}pt; vertical-align: -${depth}pt;` 
        : `width: ${result.width}pt; height: ${result.height}pt;`;

      const latexUri = encodeURIComponent(latex);
      const altText = baselineEnabled ? `ratio:${ratio}|${latexUri}` : latexUri;

      const htmlPayload = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<!--StartFragment-->
<img src="DATA_URI_PLACEHOLDER" alt="${altText}" width="${result.width}" height="${result.height}" style="${styleString}" />
<!--EndFragment-->
</body>
</html>`;

      await invoke("copy_to_clipboard", {
        svg: result.svg,
        imageBase64: imageBase64,
        isSvg: isSvg,
        latex: latex,
        mathml: "",
        html: htmlPayload
      });
      
      showToast("Copied! Now paste into Word.");
    } catch (err: any) {
      setCompileError(err.message || "Compilation failed.");
      showToast("Error copying to clipboard.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#ECECEC] font-sans text-black selection:bg-[#B3D7FF] overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#34A853] text-white text-[13px] px-4 py-2 rounded shadow-md border border-[#2B8B45] animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold drop-shadow-sm">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Classic Mac Menu Bar Simulation */}
      <div className="flex items-center justify-between px-2 py-1 bg-gradient-to-b from-[#f9f9f9] to-[#dfdfdf] border-b border-[#a3a3a3] text-[13px] h-[24px]">
        <div className="flex space-x-3 font-normal text-[#222]">
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">File</button>
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">Edit</button>
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">View</button>
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">Format</button>
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">Style</button>
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">Size</button>
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">Preferences</button>
          <button className="hover:bg-[#4a90e2] hover:text-white px-1.5 rounded-sm cursor-default">Help</button>
        </div>
        <div className="flex space-x-2 items-center ml-auto mr-2">
          <button
            onClick={async () => {
              if (!wordConnected) {
                try {
                  await invoke("open_word");
                  showToast("Opening Microsoft Word...");
                  setTimeout(async () => {
                    const isConnected = await invoke<boolean>("check_word_connection");
                    setWordConnected(isConnected);
                  }, 2000);
                } catch (e: any) {
                  showToast("Failed to open Word.");
                }
              }
            }}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
              wordConnected 
                ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 cursor-pointer'
            }`}
            title={wordConnected ? "Connected to Microsoft Word" : "Click to open and connect to Microsoft Word"}
          >
            <span className="relative flex h-2 w-2">
              {wordConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${wordConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span>{wordConnected ? "Word Connected" : "Connect Word"}</span>
          </button>
        </div>
        <div className="flex space-x-1 items-center">
          <button
            onClick={() => setBaselineEnabled(!baselineEnabled)}
            className={`flex items-center px-1.5 py-0.5 rounded border transition-all duration-200 ${
              baselineEnabled 
                ? 'bg-[#d6e4f3] border-[#8cb0d8] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]' 
                : 'hover:bg-white/50 border-transparent hover:border-[#a3a3a3]'
            }`}
            title="Toggle Baseline Alignment"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`mr-1 ${baselineEnabled ? 'text-black' : 'text-[#444]'}`}>
                <line x1="2" y1="18" x2="22" y2="18" stroke="#ff6b6b" strokeWidth="2" />
                <text x="12" y="16" fontSize="14" fontFamily="Times New Roman, serif" fontStyle="italic" textAnchor="middle" fill="currentColor" stroke="none">x</text>
                <text x="17" y="18" fontSize="10" fontFamily="Times New Roman, serif" textAnchor="middle" fill="currentColor" stroke="none">2</text>
                <line x1="2" y1="5" x2="22" y2="5" stroke="#ff6b6b" strokeWidth="2"/>
            </svg>
            <span className={`text-[10px] leading-tight ${baselineEnabled ? 'text-[#0055cc] font-medium' : 'text-[#444]'}`}>Baseline</span>
          </button>
          
          <div className="w-[1px] h-3 bg-[#a3a3a3] mx-1"></div>
          
          <button 
            onClick={() => invoke("open_word")}
            className="flex items-center text-[10px] text-[#444] hover:text-black hover:bg-white/50 px-1 py-0.5 rounded border border-transparent hover:border-[#a3a3a3]"
            title="Open Microsoft Word"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Word
          </button>
          <button 
            onClick={handleCopyOnly}
            disabled={isCompiling}
            className="flex items-center text-[10px] text-[#444] hover:text-black hover:bg-white/50 px-1 py-0.5 rounded border border-transparent hover:border-[#a3a3a3] disabled:opacity-50"
            title="Copy to Clipboard"
          >
            {isCompiling ? (
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <svg className="w-3 h-3 mr-1 text-[#0055cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            )}
            Copy
          </button>
          <button 
            onClick={handleCompileAndCopy}
            disabled={isCompiling}
            className="flex items-center text-[10px] text-[#444] hover:text-black hover:bg-white/50 px-1 py-0.5 rounded border border-transparent hover:border-[#a3a3a3] disabled:opacity-50"
            title="Insert Equation to Word"
          >
            {isCompiling ? (
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <Send className="w-3 h-3 mr-1 text-[#0055cc]" />
            )}
            Insert
          </button>

          <div className="w-[1px] h-3 bg-[#a3a3a3] mx-1"></div>

          <button 
            onClick={async () => {
              try {
                await invoke("align_word_equations");
                showToast("Aligned selection!");
              } catch (e: any) {
                showToast("Align failed: " + e.toString());
              }
            }}
            className="flex items-center text-[10px] text-[#444] hover:text-[#0055cc] hover:bg-[#d6e4f3] px-1.5 py-0.5 rounded border border-transparent hover:border-[#8cb0d8] shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-white ml-1"
            title="Align equations in current Word selection (or whole document)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mr-1 text-[#0055cc]">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-medium">Align Selection</span>
          </button>
          
          <button 
            onClick={async () => {
              try {
                const count = await invoke("align_all_word_equations");
                showToast(`Aligned ${count} equations in document!`);
              } catch (e: any) {
                showToast("Align failed: " + e.toString());
              }
            }}
            className="flex items-center text-[10px] text-[#444] hover:text-[#cc5500] hover:bg-[#f3e4d6] px-1.5 py-0.5 rounded border border-transparent hover:border-[#d8b08c] shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-white ml-1"
            title="Align all MathEditor equations in the entire Word document"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mr-1 text-[#cc5500]">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-medium">Align Document</span>
          </button>
        </div>
      </div>

      {/* MathType Top Palettes & Toolbars */}
      <div className="bg-[#ececec] border-b border-[#a3a3a3] flex flex-col pt-[2px] pb-1 px-1 select-none shrink-0 z-10">
        
        {/* Row 1: Symbol Palettes */}
        <div className="flex space-x-[1px] mb-[1px] z-50 pl-[1px]">
          {mathTypeRow1.map((palette) => (
            <PaletteButton key={palette.id} palette={palette} onInsert={insertLatex} />
          ))}
        </div>

        {/* Row 2: Template Palettes */}
        <div className="flex space-x-[1px] mb-1 z-40 pl-[1px]">
          {mathTypeRow2.map((palette) => (
            <PaletteButton key={palette.id} palette={palette} onInsert={insertLatex} />
          ))}
        </div>

        {/* MathType Tab Bar */}
        <div className="mt-1 flex flex-col px-1">
          <div className="flex border-b border-[#a3a3a3]">
            {mathTypeTabs.map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveMathTypeTab(tab)}
                className={`px-2 py-[2px] text-[11px] font-sans ${
                  activeMathTypeTab === tab
                    ? "bg-[#ffffff] text-black border-t border-l border-r border-[#a3a3a3] -mb-px relative z-10"
                    : "bg-transparent text-[#444] hover:bg-[#e0e0e0] border-t border-l border-r border-transparent"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Tab Contents Area */}
          <div className="bg-[#ffffff] border-b border-l border-r border-[#a3a3a3] p-1 flex flex-wrap gap-[1px] min-h-[46px] shadow-sm">
            {mathTypeTabItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => insertLatex(item.snippet)}
                className="p-[1px] hover:bg-[#B3D7FF] border border-transparent hover:border-[#66A3FF] cursor-default flex items-center justify-center min-w-[24px]"
                title={item.snippet}
              >
                <img src={`/src/assets/mathtype/${item.image}`} className="h-[22px] w-auto pointer-events-none opacity-90" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Visual WYSIWYG Workspace Area */}
      <div className="flex-1 bg-[#d6d6d6] flex flex-col relative overflow-hidden shadow-inner">
        {compileError && (
          <div className="absolute top-2 left-2 right-2 bg-[#ffdddd] border border-[#ff8888] text-[#cc0000] text-[11px] p-2 flex items-start shadow-sm z-20">
            <AlertCircle className="w-3 h-3 mr-1.5 shrink-0 mt-[1px]" />
            <pre className="font-mono whitespace-pre-wrap">{compileError}</pre>
          </div>
        )}

        {/* MathType Fake Ruler (visual only) */}
        <div className="h-[22px] bg-[#ececec] border-b border-[#a3a3a3] w-full flex items-end px-2 select-none shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {/* Tick marks simulating ruler */}
          <div className="h-2 w-[1px] bg-[#aaa] mr-8"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-2 w-[1px] bg-[#aaa] mr-8"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-1.5 w-[1px] bg-[#ccc] mr-2"></div>
          <div className="h-2 w-[1px] bg-[#aaa] mr-8"></div>
        </div>

        {/* MathLive Component - The Canvas! */}
        <div className="flex-1 overflow-auto bg-white p-4 cursor-text outline-none focus-within:shadow-[inset_0_0_0_1px_#4a90e2]">
          {/* @ts-ignore */}
          <math-field 
            ref={mathFieldRef} 
            className="w-full min-h-[50px] text-[36px] text-black bg-transparent outline-none border-none selection:bg-[#B3D7FF]"
          >
          {/* @ts-ignore */}
          </math-field>
        </div>
      </div>
      
      {/* Classic Status Bar */}
      <div className="h-[20px] bg-[#ececec] border-t border-[#a3a3a3] flex items-center text-[10px] text-[#333] font-sans select-none">
        <div className="px-2 border-r border-[#a3a3a3] h-full flex items-center shadow-[1px_0_0_#fff]">
          Style: Math
        </div>
        <div className="px-2 border-r border-[#a3a3a3] h-full flex items-center shadow-[1px_0_0_#fff]">
          Size: Full
        </div>
        <div className="px-2 border-r border-[#a3a3a3] h-full flex items-center shadow-[1px_0_0_#fff]">
          Zoom: 200%
        </div>
        <div className="px-2 flex-1 flex justify-between items-center text-[#666]">
          <span>Color: Black</span>
          <span>MacTeX - MathType 7 UI Clone</span>
        </div>
      </div>
    </div>
  );
}
