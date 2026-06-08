import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedOwnerId, setImpersonatedOwnerId] = useState(() => {
    return localStorage.getItem('cobrar_impersonated_id') || null;
  });

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setLoading(true);
        loadProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (options) => {
    return await supabase.auth.signInWithPassword(options);
  };

  const signUp = async (options) => {
    return await supabase.auth.signUp(options);
  };

  const signOut = async () => {
    setProfile(null);
    return await supabase.auth.signOut();
  };

  // If the user has a profile, their owner_id is profile.owner_id (for employees).
  // If they don't have a profile yet (legacy user), they act as their own owner.
  // If superadmin is impersonating, use the impersonated ID.
  const owner_id = impersonatedOwnerId || profile?.owner_id || user?.id;

  const handleSetImpersonatedOwnerId = (id) => {
    if (id) {
      localStorage.setItem('cobrar_impersonated_id', id);
    } else {
      localStorage.removeItem('cobrar_impersonated_id');
    }
    setImpersonatedOwnerId(id);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      owner_id, 
      impersonatedOwnerId,
      setImpersonatedOwnerId: handleSetImpersonatedOwnerId,
      signIn, 
      signUp, 
      signOut, 
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
