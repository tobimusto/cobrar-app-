import { useState, useEffect } from 'react';
import { Search, UserPlus, Users as UsersIcon, X, Loader2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Clients() {
  const { user, owner_id } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClient, setNewClient] = useState({ nombre: '', telefono: '', cuit: '', iva: 'Consumidor Final', domicilio: '', provincia: '' });
  
  // Debt modal state
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [debtAction, setDebtAction] = useState('sumar'); // 'sumar' or 'restar'
  const [debtAmount, setDebtAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', owner_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.nombre || !newClient.telefono) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          ...newClient,
          user_id: owner_id
        }])
        .select();

      if (error) throw error;
      
      setClients(prev => [data[0], ...prev]);
      setShowModal(false);
      setNewClient({ nombre: '', telefono: '', cuit: '', iva: 'Consumidor Final', domicilio: '', provincia: '' });
      toast.success('Cliente creado exitosamente');
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error('Hubo un error al crear el cliente.');
    }
  };

  const handleUpdateDebt = async () => {
    setErrorMsg('');
    if (!selectedClient) return;
    
    if (!debtAmount) {
      setErrorMsg('Ingresá un monto.');
      return;
    }
    
    const amount = parseFloat(debtAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('El monto debe ser mayor a 0.');
      return;
    }

    let newDebt = Number(selectedClient.deuda);
    if (debtAction === 'sumar') {
      newDebt += amount;
    } else {
      newDebt = Math.max(0, newDebt - amount);
    }

    try {
      const { error } = await supabase
        .from('clients')
        .update({ deuda: newDebt })
        .eq('id', selectedClient.id);

      if (error) throw error;

      setClients(prev => prev.map(c => 
        c.id === selectedClient.id ? { ...c, deuda: newDebt } : c
      ));
      setShowDebtModal(false);
      setDebtAmount('');
      setErrorMsg('');
      setSelectedClient(null);
      toast.success('Deuda actualizada correctamente');
    } catch (err) {
      console.error('Error updating debt:', err);
      toast.error('Hubo un error al actualizar la deuda.');
    }
  };

  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.cuit && c.cuit.includes(searchTerm))
  );

  return (
    <div className="flex flex-col h-full bg-bg overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Clientes</h1>
          <p className="text-sm text-muted">Gestiona tus clientes y sus cuentas corrientes</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="bg-surface border border-border hover:bg-surface-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-text">
            Acciones ▼
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <UserPlus size={18} />
            Nuevo Cliente
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-surface-2 border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o CUIT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
        </div>

        <div className="p-4 md:p-6 border-b border-border bg-surface">
          <h3 className="font-bold text-text text-sm">Lista de Clientes</h3>
          <p className="text-xs text-muted mt-1">Lista de todos los clientes registrados.</p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <UsersIcon size={48} className="text-dim mb-4" />
            <h3 className="text-lg font-bold text-text mb-2">No hay clientes</h3>
            <p className="text-sm text-muted mb-6">Aún no has registrado ningún cliente en tu negocio.</p>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-brand/10 text-brand hover:bg-brand/20 font-bold py-2 px-6 rounded-lg transition-all text-sm flex items-center gap-2 border border-brand/30"
            >
              <UserPlus size={16} />
              Registrar primer cliente
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm text-muted">
              <thead className="text-xs text-dim uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Condición IVA</th>
                  <th className="px-4 py-3">Deuda</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                    <td className="px-4 py-4 font-bold text-text">{client.nombre}</td>
                    <td className="px-4 py-4">{client.telefono}</td>
                    <td className="px-4 py-4">{client.iva}</td>
                    <td className="px-4 py-4 font-bold">
                      <div className="flex items-center gap-3">
                        <span className={client.deuda > 0 ? "text-red-400" : "text-brand"}>
                          ${Number(client.deuda).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDebtModal(true);
                          }}
                          className="p-1.5 bg-bg border border-border text-muted hover:text-text rounded-lg transition-colors group"
                          title="Modificar deuda"
                        >
                          <Edit2 size={14} className="group-hover:text-brand" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Nuevo Cliente Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-display font-bold text-text">Nuevo Cliente</h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-text mb-4">Información Básica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text mb-2">Nombre *</label>
                    <input 
                      type="text" 
                      value={newClient.nombre}
                      onChange={e => setNewClient({...newClient, nombre: e.target.value})}
                      placeholder="Nombre del cliente"
                      className="w-full bg-surface-2 border border-brand/30 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text transition-colors shadow-[0_0_10px_rgba(82,82,255,0.1)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-2">Teléfono *</label>
                    <input 
                      type="tel" 
                      value={newClient.telefono}
                      onChange={e => setNewClient({...newClient, telefono: e.target.value})}
                      placeholder="+54"
                      className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-2">CUIT o DNI (Opcional)</label>
                    <input 
                      type="text" 
                      value={newClient.cuit}
                      onChange={e => setNewClient({...newClient, cuit: e.target.value})}
                      placeholder="20-12345678-9 o 12345678"
                      className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-2">Condición IVA *</label>
                    <div className="relative">
                      <select 
                        value={newClient.iva}
                        onChange={e => setNewClient({...newClient, iva: e.target.value})}
                        className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                      >
                        <option>Consumidor Final</option>
                        <option>Responsable Inscripto</option>
                        <option>Monotributo</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-text mb-4">Domicilio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text mb-2">Domicilio (Opcional)</label>
                    <input 
                      type="text" 
                      value={newClient.domicilio}
                      onChange={e => setNewClient({...newClient, domicilio: e.target.value})}
                      placeholder="Dirección completa"
                      className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text mb-2">Provincia (Opcional)</label>
                    <div className="relative">
                      <select 
                        value={newClient.provincia}
                        onChange={e => setNewClient({...newClient, provincia: e.target.value})}
                        className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-muted transition-colors appearance-none"
                      >
                        <option>Seleccionar provincia</option>
                        <option>Buenos Aires</option>
                        <option>CABA</option>
                        <option>Córdoba</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-text hover:bg-surface-2 border border-transparent hover:border-border rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateClient}
                className="bg-brand hover:bg-brand-hover font-bold text-text py-2 px-5 rounded-lg transition-all text-sm shadow-[0_4px_15px_rgba(82,82,255,0.3)] flex items-center justify-center gap-2"
              >
                Crear Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt Modal */}
      {showDebtModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="p-6">
              <h2 className="text-lg font-display font-bold text-text mb-2">Modificar Deuda</h2>
              <p className="text-sm text-muted mb-6">
                Cliente: <strong className="text-text">{selectedClient.nombre}</strong><br/>
                Deuda actual: <strong className={selectedClient.deuda > 0 ? "text-red-400" : "text-brand"}>${Number(selectedClient.deuda).toLocaleString('es-AR', {minimumFractionDigits:2})}</strong>
              </p>

              <div className="flex bg-surface-2 rounded-lg p-1 mb-4 border border-border">
                <button 
                  onClick={() => setDebtAction('sumar')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${debtAction === 'sumar' ? 'bg-brand text-text' : 'text-muted hover:text-text'}`}
                >
                  Sumar Deuda
                </button>
                <button 
                  onClick={() => setDebtAction('restar')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${debtAction === 'restar' ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
                >
                  Abonar (Restar)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-2">Monto a {debtAction}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted font-bold">$</span>
                  <input 
                    type="number" 
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-2 border border-border rounded-xl py-3 pl-8 pr-4 text-text text-lg font-bold focus:outline-none focus:border-brand transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowDebtModal(false)}
                  className="flex-1 bg-transparent hover:bg-surface border border-border text-text font-medium py-3 rounded-xl transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateDebt}
                  className="flex-1 bg-brand hover:bg-brand-hover text-text font-bold py-3 rounded-xl transition-all text-sm shadow-[0_4px_15px_rgba(82,82,255,0.25)]"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
