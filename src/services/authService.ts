// Authentication & Client Session Service
export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  token: string;
}

const STORAGE_KEY = 'marcus_mobile_user_session';

export const authService = {
  getCurrentSession(): UserSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  login(password: string): { success: boolean; session?: UserSession; error?: string } {
    const cleanPass = password.trim().toLowerCase();
    
    // Master passwords / default client passwords
    if (cleanPass === 'marcus2025' || cleanPass === 'marcus' || cleanPass === 'admin' || cleanPass === 'leilao10') {
      const session: UserSession = {
        id: 'usr_marcus_admin',
        name: 'Marcus Henrique',
        email: 'marcus@assessoria.com.br',
        role: 'admin',
        token: 'tok_' + Math.random().toString(36).substring(2)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return { success: true, session };
    }

    if (cleanPass === 'cliente' || cleanPass === 'acesso' || cleanPass === 'investidor') {
      const session: UserSession = {
        id: 'usr_investor_vip',
        name: 'Investidor VIP',
        email: 'investidor@assessoria.com.br',
        role: 'client',
        token: 'tok_' + Math.random().toString(36).substring(2)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return { success: true, session };
    }

    return {
      success: false,
      error: 'Senha de acesso inválida. Use a senha fornecida pela assessoria.'
    };
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
