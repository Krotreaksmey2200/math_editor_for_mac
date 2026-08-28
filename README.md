# MacTeX MathEditor

MacTeX MathEditor is a modern, standalone mathematical equation editor tailored for macOS users. It uses Tauri, React, and MacTeX (`latex` and `dvisvgm`) to provide a MathType-like experience for seamlessly writing, compiling, and inserting equations directly into Microsoft Word.

## Features

- **WYSIWYG Palette Interface:** Clickable palettes for common math symbols and templates, similar to MathType.
- **Live LaTeX Compilation:** Instantly compiles LaTeX code into high-quality SVG and PNG images using your local MacTeX installation.
- **Perfect Baseline Alignment in Word:** Uses an advanced ratio-based calculation to automatically adjust the baseline shift (font position) of inline equations in Microsoft Word, ensuring perfect alignment with your text, regardless of how Word scales the image.
- **One-Click Insert:** Directly inserts the compiled equation into your active Word document and perfectly aligns it.
- **Batch Alignment:** Contains an "Align Document" button that scans the entire Word document and instantly realigns all equations using AppleScript and our scaling algorithms.

## Prerequisites

- **macOS** (Built specifically for Mac using AppleScript/AppleEvents to communicate with Microsoft Word).
- **Microsoft Word for Mac**.
- **MacTeX** or **BasicTeX** (Requires `latex` and `dvisvgm` binaries in `/Library/TeX/texbin`).
- **Node.js** and **Rust** (for development).

## Installation and Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run in Development Mode:**
   ```bash
   npm run tauri dev
   ```

3. **Build for Release:**
   ```bash
   npm run tauri build
   ```

## How Baseline Alignment Works

Microsoft Word for Mac handles inline pictures by occasionally scaling them down (e.g., to 31% of their original size depending on DPI and font size). 
Traditional baseline alignment methods fail because shifting the image down by the original LaTeX depth points results in a massive over-shift on the shrunken image.

**Our Solution:**
When compiling the equation, MacTeX MathEditor calculates the ratio of the equation's depth to its total height (`ratio = depth / height`). This ratio is injected into the alternative text (`altText`) of the copied image. 
When inserted into Word, an AppleScript retrieves the physical height of the image as it appears on the page, multiplies it by the ratio, and applies the exact negative font position required. This guarantees 100% perfect alignment under all circumstances.

## Tech Stack
- Frontend: React, Tailwind CSS, Lucide Icons
- Backend: Rust, Tauri, AppleScript (osascript)
- Engine: LaTeX, dvisvgm, dvipng
