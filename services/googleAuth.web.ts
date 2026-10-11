import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const performGoogleSignIn = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
};
