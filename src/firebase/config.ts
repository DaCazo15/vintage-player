/**
 * ============================================================================
 * FIREBASE CONFIGURATION & DESIGN MODELS
 * ============================================================================
 * 
 * To set up the credentials for this project:
 * 1. Open the Firebase Console (https://console.firebase.google.com).
 * 2. Select your project (or create a new one).
 * 3. Click the Gear Icon (Project Settings) next to "Project Overview" in the sidebar.
 * 4. Scroll down to the "Your apps" section and select your Web App (or register one).
 * 5. Copy the configuration values from the configuration script snippet.
 * 6. Create a `.env.local` file at the root of the workspace.
 * 7. Map the variables to the keys below (e.g., VITE_FIREBASE_API_KEY=your_key_here).
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Read configurations from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

/**
 * ============================================================================
 * FIRESTORE DATA MODELS (TypeScript Types)
 * ============================================================================
 * 
 * The database schema uses per-user nested collections to isolate user libraries
 * and playlists. This ensures strict privacy and facilitates direct rule validation.
 * 
 * Path Layouts:
 * - users/{uid}/songs/{songId}
 * - users/{uid}/playlists/{playlistId}
 */

/**
 * Song Model
 * Path: users/{uid}/songs/{songId}
 */
export interface Song {
  id?: string;                // Document ID (generated automatically by Firestore)
  title: string;              // Title of the song
  artist: string;             // Name of the artist
  audioUrl: string;           // URL of the audio file in Firebase Storage
  audioPath?: string;         // Relative path in Firebase Storage (for reliable deletion)
  coverUrl: string | null;    // URL of the cover art file in Firebase Storage (or null)
  coverPath?: string | null;  // Relative path in Firebase Storage for the cover
  duration: number;           // Duration of the audio file in seconds
  createdAt: Timestamp;       // Date and time when the song was uploaded/saved
  favorite: boolean;          // Flag indicating if the song is favorited
  isPendingSync?: boolean;    // Flag indicating if the song is missing its audio blob (e.g. from WebRTC)
}

/**
 * Playlist Model
 * Path: users/{uid}/playlists/{playlistId}
 */
export interface PlaylistSongRef {
  title: string;
  artist: string;
  originalId: string | null;
  addedAt: number;
}

export interface Playlist {
  id: string;                 // Document ID (generated automatically by Firestore)
  name: string;               // Name of the playlist
  songs: PlaylistSongRef[];   // List of songs inside the playlist
  createdAt: Timestamp;       // Date and time when the playlist was created
}
