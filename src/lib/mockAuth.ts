export const MOCK_USERS: Record<string, { password: string; displayName: string; uid: string }> = {
  'contato@tnadigital.com.br': {
    password: 'Tna2026',
    displayName: 'TNA Digital',
    uid: 'mock-uid-tnadigital',
  },
};

type AuthStateListener = (user: MockUser | null) => void;

export interface MockUser {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: null;
  providerData: { providerId: string; email: string }[];
}

let _currentUser: MockUser | null = null;
const _listeners: Set<AuthStateListener> = new Set();

function _notify(user: MockUser | null) {
  _listeners.forEach(fn => fn(user));
}

export const mockAuth = {
  get currentUser() { return _currentUser; },

  onAuthStateChanged(listener: AuthStateListener) {
    _listeners.add(listener);
    // call immediately with current state (Firebase behaviour)
    setTimeout(() => listener(_currentUser), 0);
    return () => _listeners.delete(listener);
  },
};

export async function mockLoginWithEmail(email: string, password: string): Promise<MockUser> {
  const entry = MOCK_USERS[email.toLowerCase()];
  if (!entry || entry.password !== password) {
    const err: any = new Error('auth/invalid-credential');
    err.code = 'auth/invalid-credential';
    throw err;
  }
  _currentUser = {
    uid: entry.uid,
    email,
    displayName: entry.displayName,
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: [{ providerId: 'password', email }],
  };
  _notify(_currentUser);
  return _currentUser;
}

export async function mockLogout() {
  _currentUser = null;
  _notify(null);
}

export const MOCK_USER_PROFILE = {
  displayName: 'TNA Digital',
  email: 'contato@tnadigital.com.br',
  geminiApiKey: null,
  plan: 'enterprise' as const,
  usageCount: 0,
  nfeDigits: 6,
  createdAt: null,
  updatedAt: null,
};
