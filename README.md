# PDF Editor WASM

A browser-based PDF text editor that enables high-fidelity rendering, intelligent text editing, OCR processing, and seamless PDF generation—all locally within the user's browser for privacy and performance.

## Features

- 🔒 **100% Local Processing** - All editing happens in your browser, no server uploads
- ⚡ **Instant Editing** - Click on any text to edit it directly
- 📝 **Smart Text Detection** - Automatic detection of text blocks and styles
- 🎨 **Style Preservation** - Maintains original font, size, and color
- 📄 **OCR Support** - Edit scanned PDFs using Tesseract.js
- ↩️ **Undo/Redo** - Full edit history with keyboard shortcuts
- 📥 **PDF Export** - Download your edited PDF

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **PDF.js** - PDF rendering
- **Tesseract.js** - OCR for scanned documents
- **jsPDF** - PDF generation
- **Webpack 5** - Bundling with WASM support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pdf-edit.git
cd pdf-edit

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:8080

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

1. **Upload a PDF** - Drag and drop or click to browse
2. **Click on text** - Click any text block to start editing
3. **Edit text** - Modify the text in the input box
4. **Apply changes** - Press Ctrl+Enter or click "Apply"
5. **Download** - Click the Download button to save your edited PDF

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Download PDF |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Reset zoom |
| `Escape` | Cancel edit |
| `Ctrl+Enter` | Apply edit |
| `←` / `→` | Previous/Next page |
| `Page Up` / `Page Down` | Navigate pages |

## Implementation Status

### ✅ Completed Phases (1-6)

**Phase 1: Core Rendering & PDF Loading**
- PDF.js integration with zoom/pan controls
- Multi-page navigation and lazy loading
- Canvas-based rendering with caching
- Drag-and-drop file upload
- Full-screen toggle (F11)
- Document information panel (metadata, page count, file size)

**Phase 2: Text Detection & OCR**
- PDF text layer extraction with bounding boxes
- Tesseract.js OCR for scanned documents
- Language pack configuration
- Worker pool for parallel processing

**Phase 3: Click-to-Edit & Auto-Style Detection**
- Single-click text selection
- Automatic font/size/color detection
- Auto-positioned edit input over text
- Full undo/redo history (50+ edits)

**Phase 4: Content Erasure & Text Replacement**
- Intelligent background detection
- Text masking with color matching
- Soft edge blending for smooth appearance
- Multi-edit support with proper z-index

**Phase 5: Text Reflow Logic**
- Text width calculation and positioning
- Ellipsis truncation for overflow text
- User warnings when text doesn't fit
- Fallback handling

**Phase 6: PDF Generation & Export**
- PDF export with edits preserved
- Text layer generation for searchability
- Metadata preservation and modification timestamps
- Download functionality with filename generation

### ⏳ Not Started (Phases 7-10)
- Phase 7: Performance optimization & WASM refinement
- Phase 8: Advanced features (batch editing, style picker, etc.)
- Phase 9: Comprehensive testing & QA
- Phase 10: Documentation & release preparation

**See [PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md) for detailed checklist**

## Project Structure

```
src/
├── core/           # Core types and main PDFEditor class
├── modules/        # Feature modules
│   ├── rendering/  # PDF rendering with PDF.js
│   ├── detection/  # Text detection and OCR
│   ├── editing/    # Edit state management
│   ├── erasure/    # Background detection and text erasure
│   ├── reflow/     # Text reflow logic
│   └── export/     # PDF generation and export
├── ui/             # React components
│   ├── components/ # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   └── pages/      # Page components
├── utils/          # Utility functions
├── workers/        # Web workers
└── styles/         # Global styles
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [Tesseract.js](https://tesseract.projectnaptha.com/) - OCR
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
