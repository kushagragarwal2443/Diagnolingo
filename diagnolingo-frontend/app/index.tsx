import { Redirect } from "expo-router";
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_API_KEY, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID } from '@env'; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: "diagnolingo.firebaseapp.com",
  projectId: "diagnolingo",
  storageBucket: "diagnolingo.appspot.com",
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
}); // This will now be available globally

export default function Index() {
  const user = auth.currentUser;

  if (user) {
    return <Redirect href="/(tabs)/record" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}
