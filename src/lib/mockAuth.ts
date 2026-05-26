export const MOCK_USERS: Record<string, { password: string; displayName: string; uid: string }> = {
  'contato@tnadigital.com.br': {
    password: 'Tna2026',
    displayName: 'TNA Digital',
    uid: 'mock-uid-tnadigital',
  },
};

export interface MockUser {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: null;
  providerData: { providerId: string; email: string }[];
}

export async function mockLoginWithEmail(email: string, password: string): Promise<MockUser> {
  const entry = MOCK_USERS[email.toLowerCase()];
  if (!entry || entry.password !== password) {
    const err: any = new Error('auth/invalid-credential');
    err.code = 'auth/invalid-credential';
    throw err;
  }
  return {
    uid: entry.uid,
    email,
    displayName: entry.displayName,
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: [{ providerId: 'password', email }],
  };
}
