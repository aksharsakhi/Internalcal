<p align="center">
  <img src="icon128.png" alt="InternalCalc Logo" width="100" />
</p>

<h1 align="center">InternalCalc</h1>

<p align="center">
  <strong>Smart Internal Marks Calculator for Amrita Students</strong>
</p>

<p align="center">
  <a href="https://github.com/aksharsakhi/Internalcal">
    <img src="https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white" alt="Chrome Extension" />
  </a>
  <a href="https://github.com/aksharsakhi/Internalcal/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/Manifest-V3-orange" alt="Manifest V3" />
</p>

---

## 📖 What is InternalCalc?

**InternalCalc** is a Chrome extension built for **Amrita University** students that automatically scrapes your marks from the [Amrita Student Portal](https://students.amrita.edu/client/marks) and calculates your estimated internal marks — instantly, with full customization.

No more manual spreadsheets. No more guessing your internals. Just open the portal, and InternalCalc does the rest.

---

## ✨ Features

### 🔍 Auto Scraping
- Automatically detects and reads your marks table from the Amrita Student Portal.
- Works with dynamic page loading — handles term/semester changes via `MutationObserver`.

### 📊 Smart Weighted Calculation
- Calculates weighted internal marks for each assessment component.
- Shows **per-component scores** and an **estimated total internal** for every subject.

### ⚖️ Customizable Weights
- **Mid-terms** default to **20 marks**.
- **Quizzes** default to **5 marks**.
- All other components default to their max marks.
- **Click any weight** to type a custom value — works like a normal text box.
- **Arrow keys** increment/decrement by **1** (no more 0.5 jumps).
- Only valid numbers are accepted (digits and decimals only).

### 💾 Persistent Weight Storage
- Weights are **auto-saved** to your browser's local storage.
- **Subject-specific**: Each subject's weights are stored independently using a unique key (`courseCode + examName + componentName`).
- Weights **survive page reloads**, browser close, and reopen.
- Saved weights show a subtle **green border** indicator.
- A brief **"✓ Weights auto-saved"** toast confirms every change.
- **Reset button (↺)** — clears all saved weights back to defaults with one click.

### 🌓 Light & Dark Mode
- Toggle between **Dark Mode** (default) and **Light Mode** with a single click.
- Theme preference is **saved** and remembered across sessions.

### 🕹️ Draggable Widget
- The floating widget can be **dragged anywhere** on the screen.
- Viewport clamping ensures it never gets lost off-screen.
- Smart click detection — dragging doesn't interfere with buttons, links, or inputs.

### 🖥️ Minimizable Interface
- Click the **minimize button (−)** to collapse the widget to just the header bar.
- Click **(+)** to expand it back.

### 🔗 Quick Access
- **Popup** with one-click navigation to the Marks page.
- **GitHub link** directly in the widget header for quick access to the source code.

---

## 🚀 Installation

### From Source (Developer Mode)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aksharsakhi/Internalcal.git
   ```

2. **Open Chrome** and navigate to:
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** (toggle in the top right corner).

4. Click **"Load unpacked"** and select the `InternalCalc` folder.

5. Navigate to the [Amrita Student Portal — Marks Page](https://students.amrita.edu/client/marks).

6. The **InternalCalc widget** will appear automatically in the top-right corner! 🎉

---

## 🛠️ How to Use

| Step | Action |
|------|--------|
| 1 | Install the extension and go to your Marks page |
| 2 | The widget auto-scrapes and displays your marks |
| 3 | Click on any **Weight** box to enter a custom value |
| 4 | Use **Arrow Up/Down** keys to adjust by 1 |
| 5 | Your estimated internal marks update **live** |
| 6 | Weights are **auto-saved** — they persist even after reload |
| 7 | Click **↺** in the header to reset all weights to defaults |
| 8 | Click **☀️/🌙** to toggle Light/Dark mode |
| 9 | **Drag** the header to move the widget anywhere |

---

## 📁 Project Structure

```
InternalCalc/
├── manifest.json      # Chrome Extension config (Manifest V3)
├── content.js         # Core logic: scraping, calculation, widget UI
├── content.css        # Widget styling (dark/light themes)
├── popup.html         # Extension popup UI
├── popup.js           # Popup navigation logic
├── icon128.png        # Extension icon (128×128)
└── README.md          # You are here!
```

---

## 🎨 Design

- **Color Theme**: Vibrant Blue (`#007bff`) with dark/light modes.
- **Font**: Segoe UI / Roboto — clean and readable.
- **Style**: Modern glassmorphism-inspired cards with subtle borders and shadows.
- **Animations**: Smooth slide-in entry animation for the widget.

---

## 🔒 Permissions

| Permission | Why it's needed |
|-----------|----------------|
| `activeTab` | To access the current tab's content |
| `storage` | To save weights and theme preferences |
| `tabs` | To navigate to the Marks page from the popup |
| `host_permissions: students.amrita.edu` | To run the content script on the portal |

---

## 🧠 How It Works (Technical)

1. **Content Script** (`content.js`) injects into any page matching `students.amrita.edu/client/mark*`.
2. It waits for the marks table to load using polling (`waitForTable`).
3. **MutationObserver** detects dynamic content changes (e.g., switching semesters).
4. Marks are scraped from the HTML table and organized by **subject → components**.
5. Default weights are applied intelligently (Mid-term → 20, Quiz → 5, others → maxMarks).
6. **Saved weights** from `chrome.storage.local` override defaults if they exist.
7. A floating widget is rendered with editable weight inputs and live score calculation.
8. All weight changes are **auto-saved** with subject-specific keys to persist across sessions.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs via [Issues](https://github.com/aksharsakhi/Internalcal/issues)
- 💡 Suggest features
- 🔧 Submit pull requests

---

## 📜 License

This project is open source under the [MIT License](LICENSE).

---

<p align="center">
  <em>All the best for your exams! 🍀</em>
</p>

<p align="center">
  Made with ❤️ by <a href="https://github.com/aksharsakhi">aksharsakhi</a>
</p>
