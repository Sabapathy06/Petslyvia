import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Pet } from '@/types/database';
import { petslyviaService } from '@/services/petslyviaService';

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

function getLocalAccounts(): Record<string, LocalAuthAccount> {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
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
  requestOtp: (email: string) => Promise<{ success: boolean; message: string; testOtpCode?: string; error?: string }>;
  verifyOtpAndLogin: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithOtp: (email: string, code: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  signupWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    petType: Pet['pet_type'],
    petName: string,
    role?: 'non_coder' | 'coder'
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
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
  signupWithEmail: async () => ({ success: false }),
  loginWithGoogle: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile and 1:1 primary pet
  const loadPlayerData = async (uid: string, userEmail?: string) => {
    let p = await petslyviaService.getProfile(uid);
    let petData = await petslyviaService.getPet(uid);

    // If profile doesn't exist yet, initialize exactly 1 profile & 1 infant pet
    if (!p || !petData) {
      const init = await petslyviaService.initializeNewPlayer(
        uid,
        userEmail || 'player@petslyvia.world',
        'Explorer',
        'cat',
        'Pixel'
      );
      p = init.profile;
      petData = init.pet;
    }

    setProfile(p);
    setPet(petData);
  };

  useEffect(() => {
    let mounted = true;

    // Check local session first
    const localSession = localStorage.getItem(CURRENT_SESSION_KEY);
    if (localSession) {
      try {
        const sessionObj = JSON.parse(localSession);
        if (sessionObj?.user?.id) {
          setUser(sessionObj.user);
          loadPlayerData(sessionObj.user.id, sessionObj.user.email).finally(() => {
            if (mounted) setLoading(false);
          });
          return;
        }
      } catch {
        // ignore
      }
    }

    // Check Supabase session if configured
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (s?.user) {
        setSession(s);
        setUser(s.user);
        loadPlayerData(s.user.id, s.user.email).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshProfile = async () => {
    if (user?.id) {
      await loadPlayerData(user.id, user.email);
    }
  };

  // ----------------------------------------------------
  // LOGIN WITH PASSWORD (OPTION A)
  // Hard requirement: Correct password -> Direct login, NO OTP sent.
  // ----------------------------------------------------
  const loginWithPassword = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // Check Supabase if configured
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });
      if (!error && data?.user) {
        setUser(data.user);
        setSession(data.session);
        await loadPlayerData(data.user.id, cleanEmail);
        return { success: true };
      }
    } catch {
      // fallback to local verification
    }

    // Local Verification
    const accounts = getLocalAccounts();
    const account = accounts[cleanEmail];

    if (!account) {
      return { success: false, error: 'Email or password is incorrect.' };
    }

    if (account.passwordHash !== pass) {
      return { success: false, error: 'Email or password is incorrect.' };
    }

    // Valid Password -> Direct login, NO OTP
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
    await loadPlayerData(mockUser.id, mockUser.email);
    return { success: true };
  };

  // ----------------------------------------------------
  // REQUEST OTP (OPTION B / RECOVERY)
  // ----------------------------------------------------
  const requestOtp = async (email: string): Promise<{ success: boolean; message: string; testOtpCode?: string; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getLocalAccounts();
    const account = accounts[cleanEmail];

    if (!account) {
      return {
        success: false,
        message: 'No account found with this email.',
        error: 'This email is not registered in Petslyvia.',
      };
    }

    // Generate secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    account.currentOtp = otpCode;
    account.otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 min validity
    accounts[cleanEmail] = account;
    saveLocalAccounts(accounts);

    // If Supabase is connected, trigger passwordless / reset OTP
    try {
      await supabase.auth.signInWithOtp({ email: cleanEmail });
    } catch {
      // local simulation
    }

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
      testOtpCode: otpCode, // For seamless testing & demo UI
    };
  };

  // ----------------------------------------------------
  // VERIFY OTP & LOGIN DIRECTLY
  // ----------------------------------------------------
  const verifyOtpAndLogin = async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getLocalAccounts();
    const account = accounts[cleanEmail];

    if (!account) return { success: false, error: 'Account not found.' };

    if (!account.currentOtp || account.currentOtp !== code.trim()) {
      return { success: false, error: 'Invalid 6-digit OTP code.' };
    }

    if (account.otpExpiresAt && Date.now() > account.otpExpiresAt) {
      return { success: false, error: 'OTP code has expired. Please request a new one.' };
    }

    // Clear used OTP (cannot be reused)
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
    await loadPlayerData(mockUser.id, mockUser.email);
    return { success: true };
  };

  // ----------------------------------------------------
  // RESET PASSWORD WITH OTP
  // ----------------------------------------------------
  const resetPasswordWithOtp = async (email: string, code: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getLocalAccounts();
    const account = accounts[cleanEmail];

    if (!account) return { success: false, error: 'Account not found.' };

    if (!account.currentOtp || account.currentOtp !== code.trim()) {
      return { success: false, error: 'Invalid 6-digit OTP code.' };
    }

    // Update password
    account.passwordHash = newPass;
    delete account.currentOtp;
    delete account.otpExpiresAt;
    saveLocalAccounts(accounts);

    return { success: true };
  };

  // ----------------------------------------------------
  // SIGN UP (ONE EMAIL = ONE ACCOUNT ENFORCEMENT)
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

    // Enforce ONE EMAIL = ONE ACCOUNT
    if (accounts[cleanEmail]) {
      return {
        success: false,
        error: 'This email is already registered. Please log in instead.',
      };
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Create auth record
    accounts[cleanEmail] = {
      id: userId,
      email: cleanEmail,
      passwordHash: pass,
      displayName: displayName || 'Player',
    };
    saveLocalAccounts(accounts);

    // Initialize exactly 1 Profile and 1 Infant Pet
    const init = await petslyviaService.initializeNewPlayer(
      userId,
      cleanEmail,
      displayName || 'Player',
      petType,
      petName || 'Buddy',
      role
    );

    const mockUser: User = {
      id: userId,
      email: cleanEmail,
      app_metadata: {},
      user_metadata: { display_name: displayName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: mockUser }));
    setUser(mockUser);
    setProfile(init.profile);
    setPet(init.pet);

    return { success: true };
  };

  // ----------------------------------------------------
  // SIGN IN WITH GOOGLE (OPTION C)
  // ----------------------------------------------------
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    // Demo / OAuth linking simulation:
    // If existing account exists under google email -> connects seamlessly.
    // If new -> creates 1 profile & 1 infant pet.
    const googleEmail = 'player.google@petslyvia.world';
    const accounts = getLocalAccounts();
    let account = accounts[googleEmail];

    if (!account) {
      const userId = `user_google_${Date.now()}`;
      account = {
        id: userId,
        email: googleEmail,
        passwordHash: 'oauth_managed',
        displayName: 'Google Player',
        googleLinked: true,
      };
      accounts[googleEmail] = account;
      saveLocalAccounts(accounts);

      await petslyviaService.initializeNewPlayer(userId, googleEmail, 'Google Explorer', 'fox', 'Firefox');
    }

    const mockUser: User = {
      id: account.id,
      email: account.email,
      app_metadata: { provider: 'google' },
      user_metadata: { display_name: account.displayName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ user: mockUser }));
    setUser(mockUser);
    await loadPlayerData(mockUser.id, mockUser.email);
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
        signupWithEmail,
        loginWithGoogle,
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
