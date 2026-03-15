# Kindred — The Living Friendship Book

A children's app where kids create AI-generated avatars through a voice interview, connect with friends via invite codes, and record shared story memories with AI-generated images and audio narration. Stories require parental approval (a math gate) before being shared.

Test it live here: https://kindred-c7c67.web.app/

## Tech Stack

- **Frontend:** React 19 + TypeScript, Vite 6, Tailwind CSS v4
- **Backend/Auth:** Firebase (Firestore, Google Auth, Storage)
- **AI:** Google Gemini (`@google/genai` SDK) — text, image, TTS, video, and live voice
- **Animations:** `motion/react`, **Icons:** `lucide-react`

---

## Prerequisites

- **Node.js** v18 or later
- A **Google account** (for Firebase Auth via Google Sign-in)
- A **Google AI Studio** account for a Gemini API key
- A **Firebase project** with Firestore, Authentication (Google provider), and Storage enabled

---

## 1. Clone the repo

```bash
git clone <repo-url>
cd kindred
```

## 2. Install dependencies

```bash
npm install
```

## 3. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project (or use an existing one).
2. Enable the following services:
    - **Authentication** → Sign-in method → enable **Google**
    - **Firestore Database** → create in production or test mode
    - **Storage** → create a default bucket
3. Go to **Project Settings → Your apps → Web app** and register a new web app.
4. Copy the config values — you'll need them in the next step.

## 4. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Create a new API key.
3. Make sure the key has access to the models used:
    - `gemini-2.5-flash-preview` (text)
    - `gemini-2.5-flash-image` (image generation)
    - `gemini-2.5-flash-preview-tts` (text-to-speech)
    - `veo-3.1-fast-generate-preview` (video generation)
    - `gemini-2.5-flash-native-audio-preview-09-2025` (live voice interview)

## 5. Create `.env.local`

Create a `.env.local` file in the project root with the following variables:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

All values come from the Firebase web app config (step 3) and AI Studio (step 4).

## 6. Create `.secret.local`

Create a `.secret.local`file in the functions folder with the following variables:

```env
GEMINI_API_KEY=your_gemini_api_key
```

## 7. Run locally

```bash
npm run dev
```

The app starts at **http://localhost:3000**.

> **Note:** The voice interview uses the browser microphone. Allow microphone access when prompted.

### Firebase Emulators (optional)

If you prefer to develop without hitting production Firebase, start the local emulators:

```bash
npm run emulators
```

This requires the [Firebase CLI](https://firebase.google.com/docs/cli) to be installed (`npm install -g firebase-tools`) and a `firebase.json` config in the project root pointing at your project.

---

## Available Scripts

| Command             | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Start dev server on http://localhost:3000                      |
| `npm run build`     | Production build                                               |
| `npm run preview`   | Preview the production build locally                           |
| `npm run lint`      | TypeScript type check                                          |
| `npm run clean`     | Remove the `dist/` folder                                      |
| `npm run emulators` | Start Firebase emulators (auth, firestore, storage, functions) |

---

## App Flow

1. **Sign in** with Google at `/`
2. **Select or create** a child profile at `/select-profile`
3. **Parent enters** child name and age at `/setup`
4. **Choose avatar style** (Watercolor, Pixel, etc.) at `/choose-style`
5. **Voice or text interview** — Gemini asks questions to generate a personalized avatar
6. **Dashboard** — share a 6-character invite code with a friend; once accepted, a connection is created
7. **Create a story** — pick a friend, generate a scene image + audio narration
8. **Parental approval** — a math problem gate at `/approve/:id`; once solved, the story is visible to both children

Find the architecture diagram here: https://github.com/tsyg-ai/kindred/blob/main/architecture.md
