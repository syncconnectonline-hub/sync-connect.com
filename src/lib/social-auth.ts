import { 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  OAuthProvider,
  signInWithPopup, 
  setPersistence,
  browserLocalPersistence,
  Auth,
  UserCredential
} from 'firebase/auth'

export async function loginWithGoogle(auth: Auth): Promise<UserCredential> {
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.addScope('https://www.googleapis.com/auth/gmail.compose');
  provider.addScope('https://www.googleapis.com/auth/gmail.modify');
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
  });
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;
  if (accessToken && typeof window !== 'undefined') {
    localStorage.setItem('google_gmail_access_token', accessToken);
  }
  return result;
}

export async function requestGmailPermission(auth: Auth) {
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
  });
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;
  if (accessToken && typeof window !== 'undefined') {
    localStorage.setItem('google_gmail_access_token', accessToken);
  }
  return { result, accessToken };
}

export async function loginWithFacebook(auth: Auth): Promise<UserCredential> {
  await setPersistence(auth, browserLocalPersistence);
  const provider = new FacebookAuthProvider();
  provider.addScope('email');
  provider.addScope('public_profile');
  return await signInWithPopup(auth, provider);
}

export async function loginWithTikTok(auth: Auth): Promise<UserCredential> {
  await setPersistence(auth, browserLocalPersistence);
  try {
    const provider = new OAuthProvider('tiktok.com');
    provider.addScope('user.info.basic');
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.warn("TikTok provider popup notice, falling back to Google social auth:", error);
    // Fallback to Google Social Sign-In if TikTok OAuth client ID is not configured in Firebase console
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    return await signInWithPopup(auth, provider);
  }
}
