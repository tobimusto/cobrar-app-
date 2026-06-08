import { useState, useEffect } from 'react';
import { Search, Filter, Package, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Movements() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);

  // Modal State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      fetchMovements();
      fetchProducts();
    }
  }, [user]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`*, products (name)`)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      setMovements(data || []);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleRegisterMovement = async () => {
    if (!selectedProductId || cantidad <= 0 || !motivo) {
      toast.error("Completá todos los campos correctamente.");
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const stockActual = selectedProduct.stock || 0;
    
    let newStock = stockActual;
    if (tipo === 'entrada') {
      newStock += Number(cantidad);
    } else {
      if (Number(cantidad) > stockActual) {
        toast.error("No podés retirar más stock del que tenés disponible.");
        return;
      }
      newStock -= Number(cantidad);
    }

    try {
      // 1. Insert Movement
      const { data: newMovement, error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          user_id: user.id,
          product_id: selectedProductId,
          tipo: tipo,
          cantidad: Number(cantidad),
          motivo: motivo
        }])
        .select(`*, products (name)`);

      if (movementError) throw movementError;

      // 2. Update Product Stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', selectedProductId);

      if (updateError) throw updateError;

      // 3. Update local state
      setMovements(prev => [newMovement[0], ...prev]);
      setProducts(prev => prev.map(p => p.id === selectedProductId ? { ...p, stock: newStock } : p));
      
      // Close modal
      setShowModal(false);
      setSelectedProductId('');
      setCantidad(1);
      setMotivo('');
      toast.success("Movimiento registrado con éxito");
    } catch (err) {
      console.error('Error registering movement:', err);
      toast.error('Hubo un error al registrar el movimiento.');
    }
  };

  const filteredMovements = movements.filter(m => 
    m.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.motivo && m.motivo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-cobrar-bg overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-head font-bold text-white">Movimientos de stock</h1>
          <p className="text-sm text-cobrar-txt2">Historial de entradas y salidas de tu negocio</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-cobrar-txt2">Viendo el día <strong className="text-white">Hoy</strong></span>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            + Registrar movimiento
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-cobrar-bg3 border border-cobrar-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-cobrar-border bg-cobrar-bg2 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#5252ff]/50 transition-colors"
            />
          </div>
          <button className="w-full sm:w-auto bg-cobrar-bg border border-cobrar-border hover:bg-cobrar-bg2 px-4 py-2 rounded-xl text-sm font-medium transition-colors text-white flex items-center justify-center gap-2">
            <Filter size={16} /> Filtros
          </button>
        </div>

        <div className="p-4 md:p-6 border-b border-cobrar-border bg-cobrar-bg2 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h3 className="font-bold text-white text-sm">Movimientos</h3>
            <p className="text-xs text-cobrar-txt2 mt-1">Hoy, {new Date().toLocaleDateString('es-AR')}</p>
          </div>
          <div className="flex bg-cobrar-bg border border-cobrar-border rounded-lg p-1">
            <button className="px-4 py-1 text-xs font-bold bg-[#5252ff]/20 text-[#5252ff] rounded">Resumen</button>
            <button className="px-4 py-1 text-xs font-bold text-cobrar-txt2 hover:text-white">Detalle</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="bg-cobrar-bg2 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Fecha</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Producto</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Tipo</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-center">Cantidad</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <Loader2 className="animate-spin text-[#5252ff] mx-auto" size={32} />
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-cobrar-txt3 text-sm">
                    No hubo movimientos de stock con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => (
                  <tr key={m.id} className="border-b border-cobrar-border/50 hover:bg-cobrar-bg2 transition-colors">
                    <td className="px-4 py-4 text-cobrar-txt2">{new Date(m.fecha).toLocaleDateString()} {new Date(m.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="px-4 py-4 font-bold text-white">{m.products?.name || 'Desconocido'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${m.tipo === 'entrada' ? 'bg-cobrar-green/20 text-cobrar-green' : 'bg-red-400/20 text-red-400'}`}>
                        {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-white">{m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}</td>
                    <td className="px-4 py-4 text-cobrar-txt2">{m.motivo}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nuevo Movimiento Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-cobrar-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-cobrar-txt3 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-cobrar-border bg-cobrar-bg2">
              <h2 className="text-lg font-head font-bold text-white mb-1">Registrar Movimiento Manual</h2>
              <p className="text-sm text-cobrar-txt2">Ajustá tu stock por roturas, obsequios o correcciones.</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white mb-2">Tipo de Movimiento</label>
                <div className="flex bg-[#1a1a23] rounded-lg p-1 border border-cobrar-border">
                  <button 
                    onClick={() => setTipo('entrada')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tipo === 'entrada' ? 'bg-[#5252ff] text-white' : 'text-cobrar-txt2 hover:text-white'}`}
                  >
                    Entrada
                  </button>
                  <button 
                    onClick={() => setTipo('salida')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tipo === 'salida' ? 'bg-cobrar-bg2 text-white shadow-sm' : 'text-cobrar-txt2 hover:text-white'}`}
                  >
                    Salida
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-2">Producto</label>
                <div className="relative">
                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors appearance-none"
                  >
                    <option value="">Selecciona un producto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-2">Cantidad a {tipo === 'entrada' ? 'sumar' : 'restar'}</label>
                  <input 
                    type="number" 
                    value={cantidad}
                    onChange={(e) => {
                      setCantidad(e.target.value);
                      setErrorMsg('');
                    }}
                    min="1"
                    className={`w-full bg-[#1a1a23] border rounded-lg py-2.5 px-4 text-sm focus:outline-none transition-colors ${errorMsg.includes('cantidad') ? 'border-red-500 focus:border-red-500 text-white' : 'border-[#5252ff]/30 focus:border-[#5252ff] text-white'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-2">Motivo</label>
                  <input 
                    type="text" 
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Rotura, Devolución..."
                    className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                  />
                </div>
              </div>
              
              {errorMsg && (
                <div className="mt-2 text-red-400 text-xs font-medium">{errorMsg}</div>
              )}
            </div>

            <div className="p-4 border-t border-cobrar-border bg-cobrar-bg2 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a23] border border-transparent hover:border-cobrar-border rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRegisterMovement}
                className="bg-[#5252ff] hover:bg-[#6666ff] font-bold text-white py-2 px-5 rounded-lg transition-all text-sm shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
              >
                Registrar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
