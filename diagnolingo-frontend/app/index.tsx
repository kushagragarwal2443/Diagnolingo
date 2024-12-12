import { Redirect } from "expo-router";
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDj0JQ0oVMMe7xKLiPa3r9VQsv9gKNSeQQ",
  authDomain: "diagnolingo.firebaseapp.com",
  projectId: "diagnolingo",
  storageBucket: "diagnolingo.appspot.com",
  messagingSenderId: "865609574821",
  appId: "1:865609574821:web:276e001a6af923d9d5a04c",
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
