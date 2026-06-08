import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, User, LogIn, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuperAdmin() {
  const { user, profile, setImpersonatedOwnerId } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic frontend check just to prevent casual snooping, RLS does the real security
    if (user?.email !== 'gamesexdy@gmail.com' && profile?.role !== 'Superadmin') {
      navigate('/');
      return;
    }
    
    fetchStores();
  }, [user, profile, navigate]);

  const fetchStores = async () => {
    try {
      // Get all unique owners/stores. They are usually the ones where id = owner_id
      // We can query profiles where role is Propietario or Superadmin
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['Propietario', 'Superadmin'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch basic stats for each store (optional, maybe just store settings to get business name)
      const storeSettingsPromises = data.map(async (p) => {
        const { data: settings } = await supabase
          .from('store_settings')
          .select('store_name')
          .eq('user_id', p.id)
          .single();
        return {
          ...p,
          store_name: settings?.store_name || 'Sin nombre configurado'
        };
      });

      const fullStores = await Promise.all(storeSettingsPromises);
      setStores(fullStores);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando tiendas');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = (storeId, storeName) => {
    if (storeId === user.id) {
      setImpersonatedOwnerId(null);
      toast.success('Has vuelto a tu propia tienda');
      navigate('/');
      return;
    }
    
    setImpersonatedOwnerId(storeId);
    toast.success(`Entrando a la tienda: ${storeName}`);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cobrar-bg">
        <Loader2 className="animate-spin text-[#5252ff]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cobrar-bg p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-red-500/20 p-3 rounded-xl border border-red-500/50">
            <Shield className="text-red-500" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-head font-bold text-white tracking-tight">Panel de Súper Administrador</h1>
            <p className="text-cobrar-txt2">Control maestro de tiendas y usuarios.</p>
          </div>
        </div>

        <div className="bg-cobrar-bg2 border border-cobrar-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a23] border-b border-cobrar-border text-xs uppercase tracking-wider text-cobrar-txt2">
                  <th className="p-4 font-bold">Negocio</th>
                  <th className="p-4 font-bold">Usuario / Email</th>
                  <th className="p-4 font-bold">Rol</th>
                  <th className="p-4 font-bold">ID (Owner)</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} className="border-b border-cobrar-border/50 hover:bg-[#1a1a23]/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{store.store_name}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-white">{store.username || 'Sin Username'}</div>
                      <div className="text-xs text-cobrar-txt2 mt-0.5">{store.email || 'Email no disponible'}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        store.role === 'Superadmin' ? 'bg-red-500/20 text-red-500' : 'bg-[#5252ff]/20 text-[#5252ff]'
                      }`}>
                        {store.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <code className="text-xs text-cobrar-txt2 bg-black/50 px-2 py-1 rounded">
                        {store.id.substring(0, 8)}...
                      </code>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleImpersonate(store.id, store.store_name)}
                        className="inline-flex items-center gap-2 bg-[#5252ff]/10 hover:bg-[#5252ff]/20 text-[#5252ff] border border-[#5252ff]/30 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        <LogIn size={14} /> Entrar a tienda
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {stores.length === 0 && (
            <div className="p-8 text-center text-cobrar-txt2">
              No se encontraron tiendas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
