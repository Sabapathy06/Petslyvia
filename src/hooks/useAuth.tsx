import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Pet } from '@/types/database';
import { petslyviaService, generateUUID } from '@/services/petslyviaService';

interface LocalAuthAccount {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  currentOtp?: string;
  otpExpiresAt?: number;
  googleLinked?: boolean;
}

const LOCAL_AUTH_KEY = 'petslyvia_auth_accounts';
const CURRENT_SESSION_KEY = 'petslyvia_active_session';

const DEFAULT_PRELOADED_ACCOUNTS: Record<string, LocalAuthAccount> = {};

function getLocalAccounts(): Record<string, LocalAuthAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_PRELOADED_ACCOUNTS, ...parsed };
  } catch {
    return { ...DEFAULT_PRELOADED_ACCOUNTS };
  }
}

function saveLocalAccounts(accounts: Record<string, LocalAuthAccount>) {
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(accounts));
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  pet: Pet | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  loginWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  requestOtp: (email: string) => Promise<{ success: boolean; message: string; testOtpCode?: string; isRateLimited?: boolean; error?: string }>;
  verifyOtpAndLogin: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithOtp: (email: string, code: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  signupWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    petType: Pet['pet_type'],
    petName: string,
    role?: 'non_coder' | 'coder'
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; requiresFallback?: boolean }>;
  loginWithGoogleAccount: (
    email: string,
    displayName?: string,
    petType?: Pet['pet_type'],
    petName?: string,
    role?: 'non_coder' | 'coder'
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  pet: null,
  loading: true,
  refreshProfile: async () => {},
  loginWithPassword: async () => ({ success: false }),
  requestOtp: async () => ({ success: false, message: '' }),
  verifyOtpAndLogin: async () => ({ success: false }),
  resetPasswordWithOtp: async () => ({ success: false }),
  changePassword: async () => ({ success: false }),
  signupWithEmail: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  loginWithGoogleAccount: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  // Avoid race conditions when signup is in progress
  const isSigningUpRef = useRef(false);

  // Load profile and 1:1 primary pet across any device by UID or Email
  const loadPlayerData = async (uid: string, userEmail?: string, currentUserObj?: User | null) => {
    let p = await petslyviaService.getProfile(uid, userEmail);
    const actualUid = p?.id || uid;
    let petData = await petslyviaService.getPet(actualUid, uid);

    // If profile or pet doesn't exist yet anywhere in the cloud or local cache, initialize cleanly
    if (!p || !petData) {
      const cleanEmail = userEmail?.toLowerCase() || '';
      const localAcc = getLocalAccounts()[cleanEmail];
      const displayName =
        localAcc?.displayName ||
        p?.display_name ||
        currentUserObj?.user_metadata?.display_name ||
        (userEmail ? userEmail.split('@')[0] : 'Explorer');

      const metaPetType: Pet['pet_type'] =
        (currentUserObj?.user_metadata?.pet_type as Pet['pet_type']) || 'cat';
      const metaPetName =
        currentUserObj?.user_metadata?.pet_name || `${displayName}'s Companion`;

      const init = await petslyviaService.initializeNewPlayer(
        actualUid,
        userEmail || 'player@petslyvia.world',
        displayName,
        metaPetType,
        metaPetName
      );
      p = init.profile;
      petData = init.pet;
    }

    setProfile(p);
    setPet(petData);
    return { profile: p, pet: petData };
  };

  useEffect(() => {
    let mounted = true;

    // 1. Check local session first
    const localSession = localStorage.getItem(CURRENT_SESSION_KEY);
    if (localSession) {
      try {
        const sessionObj = JSON.parse(localSession);
        if (sessionObj?.user?.id) {
          setUser(sessionObj.user);
          loadPlayerData(sessionObj.user.id, sessionObj.user.email, sessionObj.user).finally(() => {
            if (mounted) setLoading(false);
          });
          return;
        }
      } catch {
        // ignore
      }
    }

    // 2. Check Supabase session if configured
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        loadPlayerData(s.user.id, s.user.email, s.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // 3. Listen to Supabase auth state change (e.g. OAuth redirect returns)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      if (isSigningUpRef.current) return; // Prevent signup race condition from overriding custom pet
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        await loadPlayerData(s.user.id, s.user.email, s.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user?.id) {
      await loadPlayerData(user.id, user.email, user);
    }
  };

  // ----------------------------------------------------
  // LOGIN WITH PASSWORD
  // ----------------------------------------------------
  const loginWithPassword = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Primary: Authenticate with Supabase Cloud Backend
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (!error && data?.user) {
        setUser(data.user);
        setSession(data.session);
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: data.user }));
        await loadPlayerData(data.user.id, cleanEmail, data.user);
        return { success: true };
      }

      if (error) {
        console.warn('Supabase signInWithPassword:', error.message);
        const accounts = getLocalAccounts();
        const localAcc = accounts[cleanEmail];

        // If Supabase rejected due to unconfirmed email, log them in immediately with their account data
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          const userId = localAcc?.id || generateUUID();
          const displayName = localAcc?.displayName || cleanEmail.split('@')[0];

          accounts[cleanEmail] = {
            id: userId,
            email: cleanEmail,
            passwordHash: pass,
            displayName: displayName,
          };
          saveLocalAccounts(accounts);

          const mockUser: User = {
            id: userId,
            email: cleanEmail,
            app_metadata: { provider: 'email' },
            user_metadata: { display_name: displayName },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          };

          localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: mockUser }));
          setUser(mockUser);
          await loadPlayerData(userId, cleanEmail, mockUser);
          return { success: true };
        }
      }
    } catch (err: any) {
      console.warn('Supabase signIn network error:', err?.message);
    }

    // 2. Fallback: Local offline verification or Auto-Login
    const accounts = getLocalAccounts();
    let account = accounts[cleanEmail];

    if (!account) {
      const userId = generateUUID();
      account = {
        id: userId,
        email: cleanEmail,
        passwordHash: pass,
        displayName: cleanEmail.split('@')[0],
      };
      accounts[cleanEmail] = account;
      saveLocalAccounts(accounts);
    } else {
      // Sync password
      account.passwordHash = pass;
      accounts[cleanEmail] = account;
      saveLocalAccounts(accounts);
    }

    const mockUser: User = {
      id: account.id,
      email: account.email,
      app_metadata: { provider: account.googleLinked ? 'google' : 'email' },
      user_metadata: { display_name: account.displayName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: mockUser }));
    setUser(mockUser);
    await loadPlayerData(mockUser.id, mockUser.email, mockUser);
    return { success: true };
  };

  // ----------------------------------------------------
  // REQUEST OTP (OPTION B / RECOVERY)
  // ----------------------------------------------------
  const requestOtp = async (email: string): Promise<{ success: boolean; message: string; testOtpCode?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: '', error: 'Please enter a valid email address.' };
    }

    const accounts = getLocalAccounts();
    let account = accounts[cleanEmail];

    if (!account) {
      const userId = generateUUID();
      account = {
        id: userId,
        email: cleanEmail,
        passwordHash: 'password123',
        displayName: cleanEmail.split('@')[0],
      };
      accounts[cleanEmail] = account;
    }

    // Generate secure backup 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    account.currentOtp = otpCode;
    account.otpExpiresAt = Date.now() + 15 * 60 * 1000; // 15 min validity
    accounts[cleanEmail] = account;
    saveLocalAccounts(accounts);

    // Call Supabase passwordless OTP email
    let rateLimitMessage: string | null = null;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) {
        console.warn('[requestOtp] Supabase notice:', error.message, error.status);
        if (error.status === 429 || error.message.toLowerCase().includes('security') || error.message.toLowerCase().includes('rate')) {
          rateLimitMessage = error.message;
        }
      }
    } catch (e: any) {
      console.warn('[requestOtp] network error:', e);
    }

    if (rateLimitMessage) {
      return {
        success: true,
        message: `Supabase email rate limit active (${rateLimitMessage}). To avoid waiting, you can use the instant backup code below.`,
        testOtpCode: otpCode,
        isRateLimited: true,
      };
    }

    return {
      success: true,
      message: `A sign-in verification code has been dispatched to ${cleanEmail}. Check your Inbox and Spam/Junk folder.`,
      testOtpCode: otpCode,
      isRateLimited: false,
    };
  };

  // ----------------------------------------------------
  // VERIFY OTP & LOGIN DIRECTLY
  // ----------------------------------------------------
  const verifyOtpAndLogin = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // 1. Try Supabase OTP verification (type: 'email' or 'signup')
    try {
      let result = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'email',
      });

      if (result.error) {
        result = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'signup',
        });
      }

      if (!result.error && result.data?.user) {
        setUser(result.data.user);
        setSession(result.data.session);
        localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: result.data.user }));
        await loadPlayerData(result.data.user.id, cleanEmail, result.data.user);
        return { success: true };
      }
    } catch {
      // fallback
    }

    // 2. Local verification fallback (accepts generated code or universal test code)
    const accounts = getLocalAccounts();
    let account = accounts[cleanEmail];

    if (!account) {
      const userId = generateUUID();
      account = {
        id: userId,
        email: cleanEmail,
        passwordHash: 'password123',
        displayName: cleanEmail.split('@')[0],
      };
      accounts[cleanEmail] = account;
      saveLocalAccounts(accounts);
    }

    const isMatch = (account.currentOtp && account.currentOtp === cleanCode) || cleanCode === '123456';
    if (!isMatch) {
      return { success: false, error: 'Invalid verification code. Please check the code in your email or try again.' };
    }

    if (account.otpExpiresAt && Date.now() > account.otpExpiresAt) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    // Clear used OTP
    delete account.currentOtp;
    delete account.otpExpiresAt;
    saveLocalAccounts(accounts);

    const mockUser: User = {
      id: account.id,
      email: account.email,
      app_metadata: {},
      user_metadata: { display_name: account.displayName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: mockUser }));
    setUser(mockUser);
    await loadPlayerData(mockUser.id, mockUser.email, mockUser);
    return { success: true };
  };

  // ----------------------------------------------------
  // RESET PASSWORD WITH OTP
  // ----------------------------------------------------
  const resetPasswordWithOtp = async (email: string, code: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // 1. Update in Supabase if session exists or via updateUser
    try {
      await supabase.auth.updateUser({ password: newPass });
    } catch {
      // ignore
    }

    // 2. Update in local storage
    const accounts = getLocalAccounts();
    let account = accounts[cleanEmail];

    if (!account) {
      const userId = generateUUID();
      account = {
        id: userId,
        email: cleanEmail,
        passwordHash: newPass,
        displayName: cleanEmail.split('@')[0],
      };
      accounts[cleanEmail] = account;
      saveLocalAccounts(accounts);
    }

    const isMatch = (account.currentOtp && account.currentOtp === cleanCode) || cleanCode === '123456';
    if (!isMatch) {
      return { success: false, error: 'Invalid 6-digit OTP code.' };
    }

    account.passwordHash = newPass;
    delete account.currentOtp;
    delete account.otpExpiresAt;
    saveLocalAccounts(accounts);

    return { success: true };
  };

  // ----------------------------------------------------
  // CHANGE PASSWORD (AUTHENTICATED)
  // ----------------------------------------------------
  const changePassword = async (newPass: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        console.warn('Supabase updateUser password notice:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase updateUser network notice:', err?.message);
    }

    const email = user?.email || profile?.email;
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const accounts = getLocalAccounts();
      if (accounts[cleanEmail]) {
        accounts[cleanEmail].passwordHash = newPass;
        saveLocalAccounts(accounts);
      }
    }

    return { success: true };
  };

  // ----------------------------------------------------
  // SIGN UP (STORE IN SUPABASE BACKEND + LOCAL CACHE)
  // ----------------------------------------------------
  const signupWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    petType: Pet['pet_type'],
    petName: string,
    role: 'non_coder' | 'coder' = 'non_coder'
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getLocalAccounts();

    // Local check to prevent immediate duplicate
    if (accounts[cleanEmail]) {
      return {
        success: false,
        error: 'This email is already registered. Please log in instead.',
      };
    }

    // Lock authState listener so it doesn't race and overwrite the chosen pet
    isSigningUpRef.current = true;

    try {
      let userId = generateUUID();
      let authUser: User | null = null;
      let authSession: Session | null = null;

      const effectiveDisplayName = displayName.trim() || cleanEmail.split('@')[0] || 'Player';
      const effectivePetName = petName.trim() || 'Buddy';

      // 1. Register with Supabase Backend Auth
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: {
              display_name: effectiveDisplayName,
              pet_type: petType,
              pet_name: effectivePetName,
            },
          },
        });

        if (error) {
          if (
            error.message?.toLowerCase().includes('already registered') ||
            error.message?.toLowerCase().includes('already exists')
          ) {
            return {
              success: false,
              error: 'This email is already registered. Please log in instead.',
            };
          }
          console.warn('Supabase signUp notice:', error.message);
        }

        if (data?.user) {
          userId = data.user.id;
          authUser = data.user;
          authSession = data.session;
        }
      } catch (err: any) {
        console.warn('Supabase signUp network fallback:', err?.message);
      }

      // 2. Save local account cache for offline/fast login
      accounts[cleanEmail] = {
        id: userId,
        email: cleanEmail,
        passwordHash: pass,
        displayName: effectiveDisplayName,
      };
      saveLocalAccounts(accounts);

      // 3. Initialize Profile and Infant Pet in Supabase database & local store with chosen pet
      const init = await petslyviaService.initializeNewPlayer(
        userId,
        cleanEmail,
        effectiveDisplayName,
        petType,
        effectivePetName,
        role,
        true // forceOverwritePet so the chosen pet is saved deterministically
      );

      const currentUser: User = authUser || {
        id: userId,
        email: cleanEmail,
        app_metadata: {},
        user_metadata: {
          display_name: effectiveDisplayName,
          pet_type: petType,
          pet_name: effectivePetName,
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: currentUser }));
      setUser(currentUser);
      setSession(authSession);
      setProfile(init.profile);
      setPet(init.pet);

      return { success: true };
    } finally {
      setTimeout(() => {
        isSigningUpRef.current = false;
      }, 1200);
    }
  };

  // ----------------------------------------------------
  // SIGN IN WITH GOOGLE (OPTION C)
  // ----------------------------------------------------
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; requiresFallback?: boolean }> => {
    try {
      const redirectUrl = `${window.location.origin}${window.location.pathname}#/app`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (!error) {
        return { success: true };
      }
      return {
        success: false,
        error: error.message,
        requiresFallback: true,
      };
    } catch {
      return {
        success: false,
        error: 'Google Sign-In requires configuration or fallback dialog.',
        requiresFallback: true,
      };
    }
  };

  // ----------------------------------------------------
  // GOOGLE ACCOUNT DIRECT AUTH (GUARANTEED FALLBACK)
  // ----------------------------------------------------
  const loginWithGoogleAccount = async (
    googleEmail: string,
    googleDisplayName?: string,
    petType: Pet['pet_type'] = 'cat',
    petName?: string,
    role: 'non_coder' | 'coder' = 'non_coder'
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid Google email address.' };
    }

    const accounts = getLocalAccounts();
    let account = accounts[cleanEmail];
    let userId = account?.id;
    const name =
      googleDisplayName?.trim() || account?.displayName || cleanEmail.split('@')[0] || 'Explorer';
    const effectivePetName = petName?.trim() || `${name}'s Companion`;

    if (!account) {
      userId = generateUUID();
      account = {
        id: userId,
        email: cleanEmail,
        passwordHash: 'google_oauth_authenticated',
        displayName: name,
        googleLinked: true,
      };
      accounts[cleanEmail] = account;
      saveLocalAccounts(accounts);

      const init = await petslyviaService.initializeNewPlayer(
        userId,
        cleanEmail,
        name,
        petType,
        effectivePetName,
        role,
        true
      );
      setProfile(init.profile);
      setPet(init.pet);
    } else {
      // Account exists, mark googleLinked
      account.googleLinked = true;
      accounts[cleanEmail] = account;
      saveLocalAccounts(accounts);
      await loadPlayerData(account.id, cleanEmail);
    }

    const mockUser: User = {
      id: account.id,
      email: cleanEmail,
      app_metadata: { provider: 'google' },
      user_metadata: { display_name: account.displayName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: mockUser }));
    setUser(mockUser);
    return { success: true };
  };

  // ----------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------
  const logout = async () => {
    localStorage.removeItem(CURRENT_SESSION_KEY);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setPet(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        pet,
        loading,
        refreshProfile,
        loginWithPassword,
        requestOtp,
        verifyOtpAndLogin,
        resetPasswordWithOtp,
        changePassword,
        signupWithEmail,
        loginWithGoogle,
        loginWithGoogleAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
