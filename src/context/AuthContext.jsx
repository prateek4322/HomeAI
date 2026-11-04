import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import {
  getToken,
  getStoredUser,
  loginUser,
  signupUser,
  googleLoginUser,
  logoutUser,
} from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setUser(null);
    }

    setLoading(false);
  }, []);

  // Email Login
  const login = async (credentials) => {
    const data = await loginUser(credentials);
    setUser(data.user);
    return data;
  };

  // Email Signup
  const signup = async (userData) => {
    const data = await signupUser(userData);
    setUser(data.user);
    return data;
  };

  // Google Login / Signup
  const googleLogin = async (credential) => {
    const data = await googleLoginUser(credential);
    setUser(data.user);
    return data;
  };

  // Logout
  const logout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user && getToken()),
        login,
        signup,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};