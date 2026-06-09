import { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, Mail, Building, History, X, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Providers() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Selected Provider for History
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerHistory, setProviderHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // New Provider Form
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cuit, setCuit] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProviders();
    }
  }, [user]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      setProviders(data || []);
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProvider = async () => {
    if (!nombre.trim()) return toast.error("El nombre es obligatorio");
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('providers')
        .insert([{
          user_id: user.id,
          nombre,
          telefono,
          cuit,
          email,
          notas
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setProviders(prev => [data, ...prev].sort((a,b) => a.nombre.localeCompare(b.nombre)));
      setShowCreateModal(false);
      resetForm();
      toast.success('Proveedor creado exitosamente');
    } catch (error) {
      console.error('Error creating provider:', error);
      toast.error('Hubo un error al crear el proveedor');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setTelefono('');
    setCuit('');
    setEmail('');
    setNotas('');
  };

  const openHistory = async (provider) => {
    setSelectedProvider(provider);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(`*, products (name)`)
        .eq('provider_id', provider.id)
        .order('fecha', { ascending: false });
        
      if (error) throw error;
      setProviderHistory(data || []);
    } catch (error) {
      console.error('Error fetching provider history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredProviders = providers.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.cuit && p.cuit.includes(searchTerm)) ||
    (p.telefono && p.telefono.includes(searchTerm))
  );

  return (
    <div className="flex flex-col bg-bg p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Proveedores</h1>
          <p className="text-sm text-muted">Gestiona a quién le comprás y el historial de compras.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        <div className="p-4 border-b border-border bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, cuit, o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center p-12">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="col-span-full text-center text-dim text-sm p-12">
              No se encontraron proveedores.
            </div>
          ) : (
            filteredProviders.map(provider => (
              <div key={provider.id} className="bg-surface border border-border rounded-xl p-5 hover:border-brand/50 transition-all flex flex-col h-full group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-surface-2 rounded-full border border-border flex items-center justify-center shrink-0">
                    <Building size={20} className="text-muted group-hover:text-brand transition-colors" />
                  </div>
                  <button 
                    onClick={() => openHistory(provider)}
                    className="text-xs font-bold text-brand bg-brand/10 px-3 py-1.5 rounded-lg hover:bg-brand/20 transition-colors flex items-center gap-1"
                  >
                    <History size={14} /> Historial
                  </button>
                </div>
                
                <h3 className="font-bold text-lg text-text mb-1 truncate">{provider.nombre}</h3>
                
                <div className="space-y-2 mt-4 flex-1">
                  {provider.telefono && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Phone size={14} /> {provider.telefono}
                    </div>
                  )}
                  {provider.email && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <Mail size={14} /> {provider.email}
                    </div>
                  )}
                  {provider.cuit && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <User size={14} /> CUIT: {provider.cuit}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
              <h2 className="text-lg font-display font-bold text-text">Nuevo Proveedor</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-text">✕</button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text mb-2">Nombre o Razón Social *</label>
                <input 
                  type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text"
                  placeholder="Ej: Distribuidora Norte" autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text mb-2">Teléfono</label>
                  <input 
                    type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text mb-2">CUIT</label>
                  <input 
                    type="text" value={cuit} onChange={e => setCuit(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-2">Email</label>
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-2">Notas</label>
                <textarea 
                  value={notas} onChange={e => setNotas(e.target.value)}
                  rows="2"
                  className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text"
                ></textarea>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-text hover:bg-surface-2 rounded-lg transition-colors border border-transparent hover:border-border">Cancelar</button>
              <button onClick={handleCreateProvider} disabled={isSaving} className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-5 rounded-lg transition-all text-sm flex items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface shrink-0">
              <div>
                <h2 className="text-lg font-display font-bold text-text flex items-center gap-2">
                  <History size={18} className="text-brand" /> Historial de Compras
                </h2>
                <p className="text-xs text-muted mt-1">{selectedProvider.nombre}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-muted hover:text-text">✕</button>
            </div>
            
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {historyLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="animate-spin text-brand" size={32} />
                </div>
              ) : providerHistory.length === 0 ? (
                <div className="text-center text-dim text-sm p-12">
                  Aún no le compraste nada a este proveedor.
                </div>
              ) : (
                <div className="space-y-3">
                  {providerHistory.map(purchase => (
                    <div key={purchase.id} className="bg-surface-2 border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-text text-sm">{purchase.products?.name || 'Producto eliminado'}</h4>
                        <p className="text-xs text-muted mt-1">{new Date(purchase.fecha).toLocaleDateString()} a las {new Date(purchase.fecha).toLocaleTimeString()}</p>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted">Cantidad</p>
                          <p className="font-bold text-text text-sm">{purchase.cantidad} {purchase.unidad_medida}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">Costo unitario</p>
                          <p className="font-bold text-text text-sm">${Number(purchase.costo_unitario).toLocaleString()}</p>
                        </div>
                        <div className="pl-4 border-l border-border">
                          <p className="text-xs text-muted">Subtotal</p>
                          <p className="font-bold text-brand">${Number(purchase.subtotal).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
