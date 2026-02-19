import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAFpbFIKkS24X94gP0pyNBDW8KrGe2hmXI",
    authDomain: "nenipay-b1b66.firebaseapp.com",
    projectId: "nenipay-b1b66",
    storageBucket: "nenipay-b1b66.firebasestorage.app",
    messagingSenderId: "451033486398",
    appId: "1:451033486398:web:fe6c8ed914b3c3f3862d6f"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence for React Native
let auth: Auth;
try {
    // @ts-ignore
    const persistence = getReactNativePersistence(ReactNativeAsyncStorage);
    auth = initializeAuth(app, {
        persistence: persistence
    });
} catch (e) {
    // If already initialized
    auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Uploads an image to Firebase Storage and returns the download URL
 * @param uri Local URI of the image
 * @param path Storage path (e.g., 'products', 'avatars')
 * @returns Download URL or null if failed
 */
export const uploadImage = async (uri: string, path: string): Promise<string | null> => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();

        const fileName = `${path}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, fileName);

        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
};

export { auth, db, storage };
export default app;

export const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey !== "";
};
