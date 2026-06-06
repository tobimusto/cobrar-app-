import { useState, useEffect } from 'react';
import { Search, Plus, ShoppingBag, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Purchases() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);

  // New Purchase state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [costo, setCosto] = useState(0);
  const [unidad, setUnidad] = useState('Unidad');
  const [updatePrices, setUpdatePrices] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      fetchPurchases();
      fetchProducts();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`*, products (name)`)
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      setPurchases(data || []);
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, price')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleRegisterPurchase = async () => {
    setErrorMsg('');
    if (!selectedProductId) {
      setErrorMsg('Selecciona un producto.');
      return;
    }
    if (cantidad <= 0 || isNaN(cantidad)) {
      setErrorMsg('La cantidad debe ser mayor a 0.');
      return;
    }
    if (costo <= 0 || isNaN(costo)) {
      setErrorMsg('El costo debe ser mayor a 0.');
      return;
    }

    if (fechaVencimiento) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(fechaVencimiento);
      selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());
      
      if (selectedDate < today) {
        setErrorMsg('La fecha de vencimiento no puede estar en el pasado.');
        return;
      }
    }

    const subtotal = cantidad * costo;
    const selectedProduct = products.find(p => p.id === selectedProductId);

    try {
      // 1. Insert Purchase
      const { data: newPurchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          user_id: user.id,
          product_id: selectedProductId,
          cantidad: Number(cantidad),
          costo_unitario: Number(costo),
          subtotal: subtotal,
          unidad_medida: unidad
        }])
        .select(`*, products (name)`);

      if (purchaseError) throw purchaseError;

      // 2. Update Product Stock (and optionally Price)
      const newStock = (selectedProduct.stock || 0) + Number(cantidad);
      const updatePayload = { stock: newStock };
      
      if (updatePrices) {
        // If they update price, set selling price to something higher than cost (e.g., 30% margin)
        // Or just cost if they handle it manually. For MVP, we'll just set it to cost * 1.3
        updatePayload.price = Number(costo) * 1.3;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', selectedProductId);

      if (updateError) throw updateError;

      // 3. Update local state
      setPurchases(prev => [newPurchase[0], ...prev]);
      setProducts(prev => prev.map(p => p.id === selectedProductId ? { ...p, ...updatePayload } : p));
      
      // Close modal and reset
      setShowModal(false);
      setSelectedProductId('');
      setCantidad(1);
      setCosto(0);
      setUpdatePrices(false);

    } catch (err) {
      console.error('Error registering purchase:', err);
      alert('Hubo un error al registrar la compra.');
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-cobrar-bg overflow-y-auto p-8 custom-scrollbar">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-head font-bold text-white">Compras</h1>
          <p className="text-sm text-cobrar-txt2">Gestiona el historial de compras y mantené actualizado tu inventario.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center gap-2"
        >
          Nueva compra
        </button>
      </div>
      
      <div className="flex-1 bg-cobrar-bg3 border border-cobrar-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-cobrar-border bg-cobrar-bg2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por producto, unidad o usuario..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#5252ff]/50 transition-colors"
            />
          </div>
        </div>

        <div className="p-6 border-b border-cobrar-border bg-cobrar-bg2">
          <h3 className="font-bold text-white text-sm">Historial de compras</h3>
          <p className="text-xs text-cobrar-txt2 mt-1">Consulta las compras registradas y editalas cuando sea necesario.</p>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-cobrar-bg2 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Producto</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Fecha</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Unidad</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-right">Costo unitario</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-center">Cantidad</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-right">Subtotal</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Loader2 className="animate-spin text-[#5252ff] mx-auto" size={32} />
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-cobrar-txt3 text-sm">
                    No encontramos compras para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="border-b border-cobrar-border/50 hover:bg-cobrar-bg2 transition-colors">
                    <td className="px-4 py-4 font-bold text-white">{p.products?.name || 'Desconocido'}</td>
                    <td className="px-4 py-4 text-cobrar-txt2">{new Date(p.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-cobrar-txt2">{p.unidad_medida}</td>
                    <td className="px-4 py-4 text-right text-cobrar-txt2">${Number(p.costo_unitario).toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-bold text-white">{p.cantidad}</td>
                    <td className="px-4 py-4 text-right font-bold text-[#5252ff]">${Number(p.subtotal).toLocaleString()}</td>
                    <td className="px-4 py-4 text-cobrar-txt2">Vos</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nueva Compra Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-cobrar-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-cobrar-txt3 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 border-b border-cobrar-border bg-cobrar-bg2">
              <h2 className="text-lg font-head font-bold text-white mb-1">Nueva compra</h2>
              <p className="text-sm text-cobrar-txt2">Registrá la compra para sumar stock automáticamente.</p>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-medium text-white mb-2">Escanear Código de Barras</label>
                <input 
                  type="text" 
                  placeholder="Escaneá el código aquí..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const code = e.target.value.trim();
                      if (!code) return;
                      const match = products.find(p => p.code === code);
                      if (match) {
                        setSelectedProductId(match.id);
                        e.target.value = ''; // clean up
                      } else {
                        if (window.confirm('Producto no encontrado. ¿Deseas crearlo en tu catálogo?')) {
                          window.location.href = `/inventory/new?code=${code}`;
                        }
                      }
                    }
                  }}
                  className="w-full bg-cobrar-bg border border-cobrar-green/30 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-cobrar-green text-white transition-colors mb-4"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-2">O seleccionar manualmente</label>
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
                  <label className="block text-xs font-medium text-white mb-2">Cantidad</label>
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
                  <label className="block text-xs font-medium text-white mb-2">Costo unitario ($)</label>
                  <input 
                    type="number" 
                    value={costo}
                    onChange={(e) => {
                      setCosto(e.target.value);
                      setErrorMsg('');
                    }}
                    min="0.01"
                    step="0.01"
                    className={`w-full bg-[#1a1a23] border rounded-lg py-2.5 px-4 text-sm focus:outline-none transition-colors ${errorMsg.includes('costo') ? 'border-red-500 focus:border-red-500 text-white' : 'border-cobrar-border focus:border-[#5252ff]/50 text-white'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white mb-2">Unidad de medida</label>
                  <select 
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors appearance-none"
                  >
                    <option>Unidad</option>
                    <option>Caja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-2">Fecha y hora</label>
                  <input 
                    type="datetime-local" 
                    className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors custom-date-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-2">Fecha de vencimiento (opcional)</label>
                <input 
                  type="date" 
                  value={fechaVencimiento}
                  onChange={(e) => {
                    setFechaVencimiento(e.target.value);
                    setErrorMsg('');
                  }}
                  className={`w-full bg-[#1a1a23] border rounded-lg py-2.5 px-4 text-sm focus:outline-none transition-colors custom-date-input ${errorMsg.includes('vencimiento') || errorMsg.includes('pasado') ? 'border-red-500 focus:border-red-500 text-red-500' : 'border-cobrar-border focus:border-[#5252ff]/50 text-white'}`}
                />
              </div>

              {errorMsg && (
                <div className="text-red-400 text-xs font-medium">{errorMsg}</div>
              )}

              <div className="flex items-center justify-between bg-[#1a1a23] border border-cobrar-border p-4 rounded-lg mt-4">
                <div className="pr-4">
                  <p className="text-sm font-medium text-white">Actualizar precios de venta</p>
                  <p className="text-xs text-cobrar-txt2 mt-1">Ajusta los precios del producto usando los valores de esta compra. Si no activas esta opción, mantendremos el precio actual.</p>
                </div>
                {/* Custom Toggle Switch */}
                <div 
                  onClick={() => setUpdatePrices(!updatePrices)}
                  className={`w-10 h-5 rounded-full relative shrink-0 cursor-pointer transition-colors ${updatePrices ? 'bg-[#5252ff]' : 'bg-cobrar-border'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${updatePrices ? 'right-1' : 'left-1'}`}></div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-cobrar-border bg-cobrar-bg2 flex items-center justify-between">
              <div className="text-sm font-bold text-white flex gap-2">
                Subtotal: <span className="text-[#5252ff]">${(cantidad * costo).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white hover:bg-[#1a1a23] border border-transparent hover:border-cobrar-border rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRegisterPurchase}
                  className="bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-2 px-5 rounded-lg transition-all text-sm shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
                >
                  Registrar compra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
