<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Visionary AI Gallery App

![Status: Work in Progress](https://img.shields.io/badge/Status-Work%20in%20Progress-FF6B6B?style=for-the-badge) ![Vibe: Coding](https://img.shields.io/badge/Vibe-Coding-8A2BE2?style=for-the-badge)

**Visionary AI Gallery App** is an intelligent, modern media gallery application that brings advanced Artificial Intelligence capabilities to your local photo and video archives. Built with React, Vite, Capacitor, and powered by the Google Gemini API, it categorizes, understands, and retrieves your media through both semantic text search and image-based similarity search.

Originally created in [Google AI Studio](https://ai.studio/apps/drive/1lSuEr0OgNAoZXIIk2JL6RdZT-1KBnsiC), this project has been significantly expanded to support both desktop web and native mobile platforms.

## 🚧 Project Status & Roadmap

This project is currently under **active development (Work in Progress)**. Following the "Vibe Coding" philosophy, the goal is to continuously explore, iterate, and integrate new AI concepts to push the boundaries of what a personal, private gallery can achieve without relying on strictly traditional software development patterns.

**Current Progress & To-Do:**
- [x] Initial responsive UI and Layout implementation (React 19 + Tailwind v4)
- [x] Integration with Google Gemini (3 Flash Preview) for semantic media analysis
- [x] Local text-based semantic search engine
- [x] Image-based similarity search
- [x] Cross-platform scaffolding (Web & Capacitor Native iOS/Android)
- [ ] Implement smart automatic tagging and dynamic album generation
- [ ] Refine mobile user experience, touch gestures, and native pagination
- [ ] Explore on-device/local LLM execution for enhanced privacy

## ✨ Key Features

- **Intelligent Media Indexing**: Automatically analyzes images and videos to generate rich metadata (detailed descriptions, tags, dominant colors, objects, and mood) using the cutting-edge **Gemini 3 Flash Preview** model.
- **Semantic Text Search**: Go beyond classic file names. Search your gallery using natural language concepts like *"a sunny beach with red umbrellas"* or *"my cat sleeping on the couch"*.
- **Image Similarity Search**: Provide an image as a query to instantly find visually and conceptually similar items in your digital archive.
- **Cross-Platform Support**: 
  - **Desktop (Web)**: Uses the modern File System Access API to sync and view local directories directly in the browser.
  - **Mobile (Native)**: Integrated with Capacitor to natively read device photo albums (Android/iOS) and handle pagination smoothly.
- **Privacy-Forward AI Processing**: AI processing happens on demand (or during indexing), and sensitive metadata remains locally in memory/storage (IndexedDB on Web, or application state).
- **Interactive UI**: Featuring a dynamic, responsive design tailored with Tailwind CSS, including touch gestures, zooming, and panning for media viewing.

## 🛠️ Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Native Bridge**: Capacitor v6 (for iOS and Android support)
- **AI Integration**: `@google/genai` (Google Gemini API)

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- A **Google Gemini API Key**. You can get one from [Google AI Studio](https://aistudio.google.com/).

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/fernando086/Visionary---AI-Gallery-App.git
   cd Visionary---AI-Gallery-App
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Rename the `.env.example` file to `.env.local` (or just `.env`) and add your API keys:
   ```env
   VITE_GOOGLE_API_KEY=your_google_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open the provided local URL (usually `http://localhost:5173`) in your web browser.

### Building for Mobile
The application is pre-configured with Capacitor.
1. Build the web project first:
   ```bash
   npm run build
   ```
2. Sync with native platforms (e.g., Android):
   ```bash
   npx cap sync android
   npx cap open android
   ```

## 🔒 Security Note
Do not commit your `.env` or `.env.local` files containing real API keys to version control. The repository is configured to ignore these files by default. If you fork or clone this project, always use the `.env.example` as your template.

## 📄 License
This project is open-source. Feel free to modify and adapt it to your needs!
