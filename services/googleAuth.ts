import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

GoogleSignin.configure({
  webClientId: '251221632759-pskohqm9190nq399sptr9v7b6vha5gqf.apps.googleusercontent.com',
});

export const performGoogleSignIn = async (): Promise<User> => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;

  if (!idToken) {
    throw new Error('Google Sign-In failed to return an ID Token.');
  }

  const googleCredential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, googleCredential);
  return userCredential.user;
};
