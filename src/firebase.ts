/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

/**
 * Upload a File or Blob to Firebase Storage at a given path/filename and return download URL.
 */
export async function uploadFileToStorage(path: string, file: File | Blob): Promise<string> {
  try {
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    console.error('Firebase Storage upload failed:', error);
    throw new Error(`Upload failed: ${error.message || error}`);
  }
}

// Request Google Drive Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Auth state listener setup
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In trigger (from user interaction)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// ----------------------------------------------------
// Firestore Error Handlers and Operations Logging
// ----------------------------------------------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ----------------------------------------------------
// Google Drive API Interfaces & Client Helpers
// ----------------------------------------------------

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

/**
 * List files from user's Google Drive matching simple search term or specific folder.
 */
export async function listDriveFiles(): Promise<DriveFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please connect Google Drive first.');

  // Search only for JSON backup files created by Parkzone/Parkit to enforce clean least-privilege view
  const q = encodeURIComponent("(name contains 'parkzone_backup' or name contains 'parkit_backup') and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,createdTime,size,webViewLink)&orderBy=createdTime desc`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to list Drive files: ${res.statusText}. Details: ${errorBody}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create or overwrite a JSON backup file in Google Drive
 */
export async function backupDataToDrive(fileName: string, rawData: any): Promise<DriveFile> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please connect Google Drive.');

  // First, look if file with the same name already exists to overwrite/update it
  const searchQ = encodeURIComponent(`name = '${fileName}' and trashed = false`);
  const existRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQ}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  let existingFileId: string | null = null;
  if (existRes.ok) {
    const searchData = await existRes.json();
    if (searchData.files && searchData.files.length > 0) {
      existingFileId = searchData.files[0].id;
    }
  }

  const fileMetadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const fileDataBlob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
  form.append('file', fileDataBlob);

  let res;
  if (existingFileId) {
    // Perform update on Google Drive
    res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );
  } else {
    // Perform creation
    res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive write failed: ${res.statusText}. Details: ${errorText}`);
  }

  return await res.json();
}

/**
 * Download and parse file contents from Google Drive
 */
export async function downloadDataFromDrive(fileId: string): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please connect Google Drive.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Google Drive read failed: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Delete a backup file from Google Drive (Requires explicit confirmation beforehand)
 */
export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please connect Google Drive.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Google Drive delete failed: ${res.statusText}`);
  }

  return true;
}
