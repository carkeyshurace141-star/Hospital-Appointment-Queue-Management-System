import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe } from '../services/authService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'mediqueue_token';

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchMe(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  function login(newToken, newUser) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  function updateUser(newUser) {
    setUser(newUser);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [token, user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
