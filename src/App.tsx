import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "mathlive"; // Imports the <math-field> web component
import { mathTypeRow1, mathTypeRow2, mathTypeTabs, mathTypeTabItems, MathTypePalette } from "./mathTypeData";
import { CheckCircle, AlertCircle, Send } from "lucide-react";
import "./App.css";

interface TeXOutput {
  svg: string;
  base64_image: string; // Base64 of SVG
  png_base64?: string | null; // Actual PNG base64
  baseline_depth: number;
  width: number;
  height: number;
  mathml: string | null;
}

const svgToPngBase64 = (svgString: string, scale: number = 20): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let finalSvg = svgString;
    if (!finalSvg.includes('xmlns=')) {
      finalSvg = finalSvg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    const blob = new Blob([finalSvg], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } else {
        reject(new Error("No 2d context"));
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

type Lang = 'en' | 'km';

const t = {
  en: {
    file: "File", edit: "Edit", view: "View", preamble: "Preamble", style: "Style", size: "Size", pref: "Preferences", help: "Help",
    newEq: "New Equation", copy: "Copy to Clipboard", insert: "Insert to Word",
    refreshWord: "Refresh Word Connection", editPreamble: "Edit Preamble & Engine...",
    enableBaseline: "Enable Baseline Alignment", about: "About MacTeX MathEditor",
    created: "Created by",
    copyBtn: "Copy to Word", insertBtn: "Insert into Word",
    customSizeMenu: "Custom...", customSizeTitle: "Custom Font Size", customSizePrompt: "Enter custom font size (e.g. 16pt, 32pt):",
    cancel: "Cancel", setSize: "Set Size", defaultText: "(Default)"
  },
  km: {
    file: "ឯកសារ", edit: "កែប្រែ", view: "បង្ហាញ", preamble: "Preamble", style: "រចនាបថ", size: "ទំហំ", pref: "ការកំណត់", help: "ជំនួយ",
    newEq: "បង្កើតសមីការថ្មី", copy: "ចម្លងទុក", insert: "បញ្ចូលទៅ Word",
    refreshWord: "ភ្ជាប់ Word ឡើងវិញ", editPreamble: "កែសម្រួល Preamble...",
    enableBaseline: "បើកមុខងារតម្រឹមជួរ", about: "អំពី MacTeX MathEditor",
    created: "បង្កើតដោយ",
    copyBtn: "ចម្លងទៅ Word", insertBtn: "បញ្ចូលទៅ Word",
    customSizeMenu: "ទំហំផ្សេងៗ...", customSizeTitle: "កំណត់ទំហំអក្សរ", customSizePrompt: "បញ្ចូលទំហំអក្សរ (ឧទាហរណ៍៖ 16pt, 32pt):",
    cancel: "បោះបង់", setSize: "យល់ព្រម", defaultText: "(ដើម)"
  }
};

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

function MenuBarButton({ label, items }: { label: string, items: { label: string, action: () => void, disabled?: boolean }[] }) {
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

  return (
    <div className="relative inline-block" ref={buttonRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center h-[20px] hover:bg-[#4a90e2] hover:text-white px-2 rounded-sm cursor-default ${isOpen ? 'bg-[#4a90e2] text-white' : ''}`}
      >
        {label}
      </button>
      
      {isOpen && items.length > 0 && (
        <div className="absolute top-full left-0 mt-[1px] bg-white border border-[#999999] shadow-[2px_2px_4px_rgba(0,0,0,0.2)] py-1 z-[100] min-w-[180px] flex flex-col">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (!item.disabled) {
                  item.action();
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className="text-left px-4 py-1 hover:bg-[#4a90e2] hover:text-white text-[13px] text-black disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black cursor-default flex items-center justify-between"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [appLang, setAppLang] = useState<Lang>("km");
  const [latex, setLatex] = useState<string>("f(x) = \\frac{ax^3 + bx^2 + 4}{x - 2}");
  const [activeMathTypeTab, setActiveMathTypeTab] = useState<string>("Algebra");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string>("");
  const [fontSize, setFontSize] = useState<string>("12pt");
  const [baselineEnabled, setBaselineEnabled] = useState<boolean>(true);
  const [wordConnected, setWordConnected] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showCustomSize, setShowCustomSize] = useState<boolean>(false);
  const [customSizeInput, setCustomSizeInput] = useState<string>("12pt");
  const [latexEngine, setLatexEngine] = useState<"latex" | "xelatex" | "lualatex">("xelatex");
  const [preamble, setPreamble] = useState(`\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{xcolor}
\\usepackage{mathpazo}
\\usepackage{fontspec}
\\setmainfont{Khmer OS System}[
    Script=Khmer,
    Renderer=HarfBuzz % ជួយរៀបជើង និងស្រៈខ្មែរឱ្យត្រឹមត្រូវល្អ
]`);
  const [showPreambleEditor, setShowPreambleEditor] = useState<boolean>(false);
  
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
        fontSize: fontSize,
        transparent: true,
        preamble: preamble,
        latexEngine: latexEngine
      });
      
      // Determine if we have a real PNG or if we fallback to SVG
      const hasRealPng = !!result.png_base64;
      
      let finalPngBase64 = "";
      if (hasRealPng) {
        finalPngBase64 = result.png_base64!;
      } else {
        // Generate high-res PNG from SVG directly in the browser!
        finalPngBase64 = await svgToPngBase64(result.svg, 20);
      }
      
      // Always tell backend we are sending PNG because Word pasting needs it
      const isSvg = false;
      const imageBase64 = finalPngBase64;
      
      const depth = result.baseline_depth.toFixed(2);
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
      setCompileError(typeof err === 'string' ? err : err.message || "Compilation failed.");
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
        fontSize: fontSize,
        transparent: true,
        preamble: preamble,
        latexEngine: latexEngine
      });
      
      const hasRealPng = !!result.png_base64;
      let finalPngBase64 = "";
      if (hasRealPng) {
        finalPngBase64 = result.png_base64!;
      } else {
        finalPngBase64 = await svgToPngBase64(result.svg, 20);
      }
      
      const isSvg = false;
      const imageBase64 = finalPngBase64;
      
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
      setCompileError(typeof err === 'string' ? err : err.message || "Compilation failed.");
      showToast("Error copying to clipboard.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#ECECEC] font-sans text-black selection:bg-[#B3D7FF] overflow-hidden">
            {/* Preamble Editor Modal */}
      {showPreambleEditor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-[#ececec] border border-[#999999] shadow-[2px_2px_10px_rgba(0,0,0,0.3)] w-[500px] flex flex-col font-sans">
            <div className="bg-gradient-to-b from-[#ffffff] to-[#dfdfdf] px-3 py-1.5 border-b border-[#a3a3a3] flex justify-between items-center cursor-default">
              <h2 className="text-[13px] font-semibold text-black">LaTeX Engine & Preamble</h2>
              <button onClick={() => setShowPreambleEditor(false)} className="text-black hover:bg-[#ff4c4c] hover:text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold leading-none border border-transparent hover:border-[#cc0000]">×</button>
            </div>
            <div className="p-4 flex flex-col space-y-4">
              <div className="flex items-center space-x-3">
                <label className="text-[12px] text-black font-medium">LaTeX Engine:</label>
                <select 
                  value={latexEngine} 
                  onChange={(e) => {
                    const newEngine = e.target.value;
                    setLatexEngine(newEngine as any);
                    if (newEngine === "latex") {
                      setPreamble(prev => prev.replace(/\\usepackage\{fontspec\}\n?/g, "").replace(/\\setmainfont\{[^}]*\}\[[\s\S]*?\]\n?/g, "").trim());
                    } else if (newEngine === "xelatex") {
                      setPreamble(prev => {
                        if (!prev.includes("fontspec")) {
                          return prev + `\n\\usepackage{fontspec}\n\\setmainfont{Khmer OS System}[\n    Script=Khmer,\n    Renderer=HarfBuzz\n]`;
                        }
                        return prev;
                      });
                    }
                  }}
                  className="bg-white border border-[#a3a3a3] text-[12px] px-2 py-1 rounded shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:border-[#4a90e2]"
                >
                  <option value="latex">LaTeX (DVI)</option>
                  <option value="xelatex">XeLaTeX (XDV)</option>
                  <option value="lualatex">LuaLaTeX (DVI)</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[12px] text-black font-medium">Preamble:</label>
                <textarea 
                  value={preamble}
                  onChange={(e) => setPreamble(e.target.value)}
                  className="w-full h-[150px] bg-white border border-[#a3a3a3] text-[12px] font-mono p-2 resize-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:border-[#4a90e2]"
                  spellCheck={false}
                />
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setShowPreambleEditor(false)}
                  className="bg-white border border-[#a3a3a3] px-4 py-1 text-[12px] rounded shadow-sm hover:bg-[#e6e6e6] active:bg-[#d4d4d4]"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
          <MenuBarButton label={t[appLang].file} items={[
            { label: t[appLang].newEq, action: () => { if (mathFieldRef.current) mathFieldRef.current.value = ""; setLatex(""); } }
          ]} />
          <MenuBarButton label={t[appLang].edit} items={[
            { label: t[appLang].copy, action: handleCopyOnly },
            { label: t[appLang].insert, action: handleCompileAndCopy }
          ]} />
          <MenuBarButton label={t[appLang].view} items={[
            { label: t[appLang].refreshWord, action: async () => {
                try {
                  const isConnected = await invoke<boolean>("check_word_connection");
                  setWordConnected(isConnected);
                  showToast(isConnected ? "Word is connected" : "Word is not connected");
                } catch(e) {
                  showToast("Word is not connected");
                }
            } }
          ]} />
          <MenuBarButton label={t[appLang].preamble} items={[
            { label: t[appLang].editPreamble, action: () => setShowPreambleEditor(true) }
          ]} />
          <MenuBarButton label={t[appLang].style} items={[
            { label: "Text", action: () => { if(mathFieldRef.current) mathFieldRef.current.insert('\text{#0}'); } },
            { label: "Function (Roman)", action: () => { if(mathFieldRef.current) mathFieldRef.current.insert('\mathrm{#0}'); } },
            { label: "Variable (Italic)", action: () => { if(mathFieldRef.current) mathFieldRef.current.insert('\mathit{#0}'); } },
            { label: "Vector-Matrix (Bold)", action: () => { if(mathFieldRef.current) mathFieldRef.current.insert('\mathbf{#0}'); } },
            { label: "Calligraphic", action: () => { if(mathFieldRef.current) mathFieldRef.current.insert('\mathcal{#0}'); } },
            { label: "Fraktur", action: () => { if(mathFieldRef.current) mathFieldRef.current.insert('\mathfrak{#0}'); } },
            { label: "Blackboard Bold", action: () => { if(mathFieldRef.current) mathFieldRef.current.insert('\mathbb{#0}'); } }
          ]} />
          <MenuBarButton label={t[appLang].size} items={[
            { label: fontSize === "10pt" ? "✓ 10pt" : "  10pt", action: () => setFontSize("10pt") },
            { label: fontSize === "11pt" ? "✓ 11pt" : "  11pt", action: () => setFontSize("11pt") },
            { label: fontSize === "12pt" ? `✓ 12pt ${t[appLang].defaultText}` : `  12pt ${t[appLang].defaultText}`, action: () => setFontSize("12pt") },
            { label: fontSize === "14pt" ? "✓ 14pt" : "  14pt", action: () => setFontSize("14pt") },
            { label: fontSize === "18pt" ? "✓ 18pt" : "  18pt", action: () => setFontSize("18pt") },
            { label: fontSize === "24pt" ? "✓ 24pt" : "  24pt", action: () => setFontSize("24pt") },
            { label: !["10pt","11pt","12pt","14pt","18pt","24pt"].includes(fontSize) ? `✓ ${t[appLang].customSizeMenu} (${fontSize})` : `  ${t[appLang].customSizeMenu}`, action: () => { setCustomSizeInput(fontSize); setShowCustomSize(true); } }
          ]} />
          <MenuBarButton label={t[appLang].pref} items={[
            { label: baselineEnabled ? `✓ ${t[appLang].enableBaseline}` : `  ${t[appLang].enableBaseline}`, action: () => setBaselineEnabled(!baselineEnabled) }
          ]} />
          <MenuBarButton label={t[appLang].help} items={[
            { label: t[appLang].about, action: () => setShowAbout(true) }
          ]} />
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
            className={`flex items-center justify-center px-2 h-[20px] rounded text-[10px] font-semibold transition-colors border ${
              wordConnected 
                ? 'text-green-600 border-transparent cursor-default'
                : 'text-red-500 hover:text-red-600 hover:bg-white/50 border-transparent hover:border-[#a3a3a3] cursor-pointer'
            }`}
            title={wordConnected ? "Connected to Microsoft Word" : "Click to open and connect to Microsoft Word"}
          >
            <span>Word</span>
          </button>
        </div>
        <div className="flex space-x-1 items-center">
          <button
            onClick={() => setBaselineEnabled(!baselineEnabled)}
            className={`flex items-center px-2 h-[20px] rounded border transition-all duration-200 ${
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
            className="flex items-center h-[20px] text-[10px] text-[#444] hover:text-black hover:bg-white/50 px-2 rounded border border-transparent hover:border-[#a3a3a3]"
            title="Open Microsoft Word"
          >
            Open Word
          </button>
          <button 
            onClick={handleCopyOnly}
            disabled={isCompiling}
            className="flex items-center h-[20px] text-[10px] text-[#444] hover:text-black hover:bg-white/50 px-2 rounded border border-transparent hover:border-[#a3a3a3] disabled:opacity-50"
            title="Copy to Clipboard"
          >
            {isCompiling ? (
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <svg className="w-3 h-3 mr-1 text-[#0055cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            )}
            {t[appLang].copyBtn}
          </button>
          <button 
            onClick={handleCompileAndCopy}
            disabled={isCompiling}
            className="flex items-center h-[20px] text-[10px] text-[#444] hover:text-black hover:bg-white/50 px-2 rounded border border-transparent hover:border-[#a3a3a3] disabled:opacity-50"
            title="Insert Equation to Word"
          >
            {isCompiling ? (
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <Send size={12} strokeWidth={1.5} className="mr-1 text-[#0055cc]" />
            )}
            {t[appLang].insertBtn}
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
            className="flex items-center h-[20px] text-[10px] text-[#444] hover:text-[#0055cc] hover:bg-[#d6e4f3] px-2 rounded border border-transparent hover:border-[#8cb0d8] shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-white ml-1"
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
            className="flex items-center h-[20px] text-[10px] text-[#444] hover:text-[#cc5500] hover:bg-[#f3e4d6] px-2 rounded border border-transparent hover:border-[#d8b08c] shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-white ml-1"
            title="Align all MathEditor equations in the entire Word document"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mr-1 text-[#cc5500]">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-medium">Align Document</span>
          </button>
          
          <select 
            value={appLang} 
            onChange={(e) => setAppLang(e.target.value as Lang)}
            className="h-[18px] text-[10px] bg-white border border-[#a3a3a3] rounded text-[#333] outline-none ml-2"
          >
            <option value="en">EN</option>
            <option value="km">ខ្មែរ</option>
          </select>
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
            {mathTypeTabs.map((tab) => (
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
            {(mathTypeTabItems[activeMathTypeTab] || []).map((item, idx) => (
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
          Size: {fontSize}
        </div>
        <div className="px-2 flex-1 flex justify-between items-center text-[#666]">
          <span>Color: Black</span>
          <span 
            className="cursor-pointer hover:text-[#0055cc] hover:underline"
            onClick={() => setShowAbout(true)}
            title="About MacTeX MathEditor"
          >
            MacTeX
          </span>
        </div>
      </div>
      {/* About Modal */}
      {showAbout && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999]"
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
        >
          <div 
            className="bg-[#ececec] border border-[#a3a3a3] rounded-md shadow-2xl flex flex-col overflow-hidden font-sans"
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              width: '100%',
              maxWidth: '350px',
              minWidth: '300px'
            }}
          >
            <div className="bg-[#dcdcdc] border-b border-[#a3a3a3] px-3 py-2 flex justify-between items-center">
              <span className="font-bold text-sm" style={{ color: '#000000' }}>About MacTeX MathEditor</span>
              <button onClick={() => setShowAbout(false)} className="hover:text-red-600 focus:outline-none" style={{ color: '#000000' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center text-center gap-3 bg-white">
              <div className="w-20 h-20 flex items-center justify-center mb-2">
                <img src="/logo.png" alt="App Logo" className="w-full h-full object-contain drop-shadow-md rounded-2xl" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: '#000000' }}>MacTeX MathEditor</h2>
              <p className="text-sm font-medium bg-[#f0f0f0] px-4 py-1 rounded-full border border-[#cccccc]" style={{ color: '#000000' }}>Version 0.4.1</p>
              
              <div className="mt-4 pt-4 border-t border-[#eeeeee] w-full flex flex-col items-center">
                <p className="text-sm font-semibold" style={{ color: '#000000' }}>{t[appLang].created}</p>
                <p className="text-base font-bold mt-1" style={{ color: '#0055cc' }}>KROT Reaksmey</p>
              </div>
            </div>

            <div className="bg-[#dcdcdc] border-t border-[#a3a3a3] px-3 py-2 flex justify-center">
              <button 
                onClick={() => setShowAbout(false)} 
                className="px-6 py-1 bg-white border border-[#a3a3a3] rounded text-sm hover:bg-gray-50 focus:outline-none shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Size Modal */}
      {showCustomSize && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9999]"
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
        >
          <div 
            className="bg-[#ececec] border border-[#a3a3a3] rounded-md shadow-2xl flex flex-col overflow-hidden font-sans"
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              width: '100%',
              maxWidth: '300px'
            }}
          >
            <div className="bg-[#dcdcdc] border-b border-[#a3a3a3] px-3 py-2 flex justify-between items-center">
              <span className="font-bold text-sm" style={{ color: '#000000' }}>{t[appLang].customSizeTitle}</span>
              <button onClick={() => setShowCustomSize(false)} className="hover:text-red-600 focus:outline-none" style={{ color: '#000000' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 flex flex-col gap-3 bg-white">
              <p className="text-[13px]" style={{ color: '#000000' }}>{t[appLang].customSizePrompt}</p>
              <input 
                type="text" 
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFontSize(customSizeInput);
                    setShowCustomSize(false);
                  }
                }}
                className="border border-[#a3a3a3] rounded px-2 py-1 text-sm outline-none focus:border-[#4a90e2]"
                style={{ color: '#000000', backgroundColor: '#ffffff' }}
                autoFocus
              />
            </div>

            <div className="bg-[#dcdcdc] border-t border-[#a3a3a3] px-3 py-2 flex justify-end gap-2">
              <button 
                onClick={() => setShowCustomSize(false)} 
                className="px-4 py-1 bg-white border border-[#a3a3a3] rounded text-sm hover:bg-gray-50 focus:outline-none shadow-sm"
                style={{ color: '#000000' }}
              >
                {t[appLang].cancel}
              </button>
              <button 
                onClick={() => {
                  setFontSize(customSizeInput);
                  setShowCustomSize(false);
                }} 
                className="px-4 py-1 bg-[#4a90e2] border border-[#3070b3] rounded text-sm text-white hover:bg-[#357abd] focus:outline-none shadow-sm"
              >
                {t[appLang].setSize}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
