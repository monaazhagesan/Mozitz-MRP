import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  email: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.withCredentials = true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  // Get logged in user on load
 useEffect(() => {
  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/check-session');
      if (res.data.logged_in) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  checkAuth();
}, []);


const signUp = async ( email: string, password: string) => {
  try {
    await axios.get('/sanctum/csrf-cookie');
    const res = await axios.post('/api/register', { email, password });
    setUser(null);
      setSession(res.data.session ?? null);
    
    return { error: null };
  } catch (error: any) {
    if (error.response) {
      // Laravel validation error (422) or other backend error
      return {
        error: error.response.data?.message || 'Registration failed',
        errors: error.response.data?.errors || null,
        status: error.response.status,
      };
    } else if (error.request) {
      // Server not responding
      return {
        error: 'Server not responding. Please try again.',
        status: 500,
      };
    } else {
      // Unknown error
      return {
        error: error.message || 'Something went wrong',
      };
    }
  }
};


const signIn = async (email: string, password: string) => {
  try {
    await axios.get('/sanctum/csrf-cookie');
    const res = await axios.post('/api/login', { email, password });
    setUser(res.data.user);
    setSession(res.data.session);
    navigate('/');
    return { error: null };
  } catch (error: any) {
    // Axios error
    if (error.response) {
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        "Login failed";

      return {
        error: message,
        status: error.response.status,
        errors: error.response.data?.errors || null,
      };
    }

    // Network error
    if (error.request) {
      return { error: "Server not responding. Please try again.", status: 500 };
    }

    // Unknown error
    return { error: error.message || "Something went wrong" };
  }
};


const resetPassword = async (email: string) => {
  try {
    await axios.get('/sanctum/csrf-cookie');

    const res = await axios.post('/api/forgot-password', {
      email,
    });

    return {
      error: null,
      message: res.data.message,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        error:
          error.response.data?.message ||
          'Failed to send reset email',
      };
    }

    return {
      error: 'Server not responding',
    };
  }
};

  const signOut = async () => {
    await axios.post('/logout');
    setUser(null);
    setSession(null); 
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user,session, signUp, signIn, signOut, resetPassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
