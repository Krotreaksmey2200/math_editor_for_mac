# MacTeX MathEditor (Khmer Math Editor)

**MacTeX MathEditor** is a modern, standalone mathematical equation editor tailored for macOS users and Microsoft Word integration. It combines Tauri, React, and MacTeX (`latex` and `dvisvgm`) to provide a MathType-like experience for seamlessly writing, compiling, and inserting equations directly into Microsoft Word with 100% perfect baseline alignment.

---

## 🇰🇭 លក្ខណៈពិសេសចម្បង (Features)

- **WYSIWYG Math Palette:** Clickable palettes with rendered mathematical symbol icons (KaTeX) for fast equation creation.
- **Live LaTeX Compilation:** Instantly compiles LaTeX code into SVG and high-resolution PNG images using your local MacTeX installation.
- **Perfect Baseline Alignment in Word:** Uses a ratio-based calculation (`depth / height`) stored in image metadata. Microsoft Word automatically shifts inline equations to align perfectly with surrounding body text.
- **One-Click Word Insertion:** Instantly inserts compiled equations into your active Microsoft Word document.
- **Bi-directional Editing:** Double-click equations in Word to edit them back inside MacTeX MathEditor.
- **Automated Installers:** Bundled `.pkg` and `.dmg` installers for quick setup.

---

## 📁 គ្រោងចរចនាសម្ព័ន្ធ Project (Repository Structure)

```text
mactex-math-editor/
├── src/                          # React Frontend (UI Components & Palettes)
│   ├── App.tsx                   # Main Workspace Interface
│   ├── mathTypeData.ts           # MathType Palette definitions & snippets
│   └── mathSymbols.ts            # Symbol categorization
├── src-tauri/                    # Tauri Rust Backend
│   ├── src/lib.rs                # macOS Clipboard & AppleScript bridge
│   ├── word_plugin/              # Word Add-in (.dotm) & AppleScript (.scpt)
│   └── tauri.conf.json           # Tauri build settings
├── public/                       # Static Assets & MathType icons
│   └── mathtype/                 # 239 rendered math symbol icons
├── addin/                        # Web Add-in Manifests
├── build_installer_dmg.sh        # Automated DMG package builder script
└── README.md                     # Project documentation
```

---

## 🚀 របៀប Install & Run (Development & Setup)

### Prerequisites
- **macOS** (Built specifically for macOS & Microsoft Word for Mac)
- **Microsoft Word for Mac**
- **MacTeX** or **BasicTeX** (Requires `latex` and `dvisvgm` in `/Library/TeX/texbin`)
- **Node.js** (v18+) & **Rust** (for development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
- **Web Preview:**
  ```bash
  npm run dev
  ```
- **Native macOS Application (Tauri Dev Mode):**
  ```bash
  npm run tauri dev
  ```

### 3. Build Production Installer Packages
- **Build App & Standard Release:**
  ```bash
  npm run tauri build
  ```
- **Build Full `.dmg` & `.pkg` Installer:**
  ```bash
  ./build_installer_dmg.sh
  ```

---

## 📄 License & Credits

Created by **Heng / Krotreaksmey2200**. Built using React, Tauri, KaTeX, and TailwindCSS.
