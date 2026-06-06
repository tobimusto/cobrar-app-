import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, User, HelpCircle, LayoutGrid, Wallet, Lock, CreditCard, Smartphone } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function POS() {
  const { user } = useAuth();
  const { isRegisterOpen, setShowCashModal, setCashAction, cashAmount, setCashAmount } = useOutletContext();
  
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [ivaCondition, setIvaCondition] = useState('Consumidor Final');
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // efectivo, tarjeta, transferencia
  const [amountTendered, setAmountTendered] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre');
      
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchClients();
    }
  }, [user]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code && p.code.includes(searchTerm))
  );

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
    setSearchTerm('');
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const change = paymentMethod === 'efectivo' && amountTendered 
    ? Math.max(0, Number(amountTendered) - total) 
    : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Validar monto si es efectivo
    if (paymentMethod === 'efectivo' && Number(amountTendered) < total) {
      alert("El monto ingresado es menor al total de la venta.");
      return;
    }

    try {
      setProcessing(true);
      
      // 1. Registrar Venta
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{ 
          total, 
          payment_method: paymentMethod,
          user_id: user.id 
        }])
        .select()
        .single();
        
      if (saleError) throw saleError;
      
      // 2. Registrar Items de la Venta y restar stock
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        qty: item.qty,
        price: item.product.price,
        user_id: user.id
      }));
      
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // Restar stock de productos
      for (const item of cart) {
        const { data: prodData } = await supabase.from('products').select('stock').eq('id', item.product.id).single();
        if (prodData) {
          await supabase.from('products').update({ stock: (prodData.stock || 0) - item.qty }).eq('id', item.product.id);
        }
      }
      
      // 3. Si es efectivo, registrar ingreso en la caja
      if (paymentMethod === 'efectivo') {
        const newCash = cashAmount + total;
        const { error: cashError } = await supabase.from('cash_movements').insert([{
          user_id: user.id,
          tipo: 'ingreso',
          monto: total,
          motivo: `Venta #${saleData.id.split('-')[0]}`,
          saldo_anterior: cashAmount,
          saldo_nuevo: newCash
        }]);
        if (cashError) console.error("Error updating cash:", cashError);
        else setCashAmount(newCash);
      }

      setCart([]);
      setShowCheckout(false);
      setAmountTendered('');
      alert(`Venta registrada con éxito (#${saleData.id.split('-')[0]})`);
      
      // Refetch products to get updated stock
      fetchProducts();
    } catch (err) {
      console.error('Error during checkout:', err);
      alert('Hubo un error al procesar la venta.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isRegisterOpen) {
    return (
      <div className="flex flex-col h-full bg-cobrar-bg items-center justify-center p-8">
        <div className="bg-[#1a1a23] border border-[#5252ff]/30 rounded-3xl p-12 text-center max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[#5252ff]/5 blur-3xl pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-[#5252ff]/20 text-[#5252ff] rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10">
            <Lock size={40} />
          </div>
          
          <h1 className="text-3xl font-head font-bold text-white mb-3 relative z-10">Caja Cerrada</h1>
          <p className="text-cobrar-txt2 mb-8 relative z-10 text-sm leading-relaxed">
            Para poder empezar a registrar ventas y movimientos, es necesario realizar la apertura de caja y definir tu monto inicial.
          </p>
          
          <button 
            onClick={() => {
              setCashAction('abrir');
              setShowCashModal(true);
            }}
            className="w-full bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(82,82,255,0.3)] relative z-10 text-lg"
          >
            Abrir Caja Ahora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-cobrar-bg">
      {/* Header POS */}
      <div className="flex justify-between items-center p-6 shrink-0 border-b border-cobrar-border bg-cobrar-bg2">
        <div>
          <h1 className="text-xl font-head font-bold text-white">Punto de Venta</h1>
          <p className="text-sm text-cobrar-txt2">Sistema POS - CobrAR</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm font-medium text-cobrar-txt2 hover:text-white transition-colors bg-cobrar-bg px-3 py-1.5 rounded-lg border border-cobrar-border">
            <LayoutGrid size={16} /> Tutorial
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-cobrar-txt2 hover:text-white transition-colors bg-cobrar-bg px-3 py-1.5 rounded-lg border border-cobrar-border">
            <HelpCircle size={16} /> Ayuda <span className="bg-cobrar-bg3 px-1.5 py-0.5 rounded text-[10px] border border-cobrar-border">F1</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden p-6 gap-6">
        {/* LEFT COLUMN: Search & Cart */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Search Box */}
          <div className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl p-5 shrink-0">
            <h2 className="text-sm font-head font-bold text-white mb-3">Buscar Producto</h2>
            <p className="text-xs text-cobrar-txt2 mb-4">Escanee código de barras o escriba el nombre del producto</p>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-green" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar producto... (Enter para agregar)" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const exactMatch = products.find(p => p.code === searchTerm);
                      if (exactMatch) {
                        addToCart(exactMatch);
                      } else if (filteredProducts.length === 1) {
                        addToCart(filteredProducts[0]);
                      }
                    }
                  }}
                  className="w-full bg-cobrar-bg border border-cobrar-green/30 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cobrar-green transition-colors text-white placeholder:text-cobrar-txt3"
                  autoFocus
                />
                
                {/* Search Results Dropdown (Simplified) */}
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-cobrar-bg2 border border-cobrar-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full text-left px-4 py-3 hover:bg-cobrar-bg3 flex justify-between items-center border-b border-cobrar-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{p.icon || '📦'}</span>
                          <span className="font-medium text-sm text-white">{p.name}</span>
                        </div>
                        <span className="font-bold text-cobrar-green text-sm">${p.price.toLocaleString('es-AR')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button className="bg-cobrar-bg2 border border-cobrar-border text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-cobrar-bg3 transition-colors flex items-center gap-2">
                <Search size={16} /> Consultar Precio
              </button>
              <button className="bg-cobrar-bg2 border border-cobrar-border text-white text-sm font-medium px-4 py-3 rounded-xl hover:bg-cobrar-bg3 transition-colors flex items-center gap-2">
                <Plus size={16} /> Agregar Monto
              </button>
            </div>
          </div>

          {/* Cart List */}
          <div className="flex-1 bg-cobrar-bg3 border border-cobrar-border rounded-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-cobrar-border shrink-0">
              <h2 className="text-sm font-head font-bold text-white">Carrito</h2>
              <p className="text-xs text-cobrar-txt2 mt-1">
                {cart.length === 0 ? 'El carrito está vacío' : `${cart.length} productos en el carrito`}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-cobrar-txt3 gap-3">
                  <ShoppingCart size={48} className="opacity-20" />
                  <div className="text-center">
                    <p className="font-medium text-white mb-1">Carrito vacío</p>
                    <p className="text-xs">Buscá productos para agregar al carrito</p>
                  </div>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="bg-cobrar-bg2 p-4 rounded-xl border border-transparent hover:border-cobrar-border flex items-center gap-4 group transition-colors">
                    <div className="w-10 h-10 bg-cobrar-bg rounded-lg border border-cobrar-border flex items-center justify-center text-xl shrink-0">
                      {item.product.icon || '📦'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.product.name}</h4>
                      <div className="text-cobrar-txt2 text-[11px] mt-0.5">${item.product.price.toLocaleString('es-AR')} c/u</div>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-1 bg-cobrar-bg rounded-lg border border-cobrar-border p-1">
                        <button onClick={() => updateQty(item.product.id, -1)} className="p-1 hover:text-white text-cobrar-txt2 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center text-white">{item.qty}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} className="p-1 hover:text-white text-cobrar-txt2 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <div className="w-24 text-right">
                        <div className="font-bold text-cobrar-green">${(item.product.price * item.qty).toLocaleString('es-AR')}</div>
                      </div>
                      
                      <button 
                        onClick={() => removeItem(item.product.id)} 
                        className="p-2 text-cobrar-txt3 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Client & Summary */}
        <div className="w-[350px] flex flex-col gap-6 shrink-0">
          
          {/* Client Box */}
          <div className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl p-5">
            <h2 className="text-sm font-head font-bold text-white flex items-center gap-2 mb-3">
              <User size={16} className="text-cobrar-txt2" /> Cliente
            </h2>
            <p className="text-xs text-cobrar-txt2 mb-4">Ingresá los datos para la factura</p>
            
            <div className="relative mb-4">
              <label className="block text-[10px] uppercase font-bold text-cobrar-txt2 mb-1.5 tracking-wider">Condición IVA</label>
              <select 
                value={ivaCondition}
                onChange={(e) => setIvaCondition(e.target.value)}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cobrar-green/50 transition-colors text-white appearance-none cursor-pointer"
              >
                <option value="Consumidor Final">Consumidor Final</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributo">Monotributo</option>
                <option value="Exento">Exento</option>
              </select>
              <div className="absolute right-4 bottom-3 pointer-events-none text-cobrar-txt2">
                ▼
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] uppercase font-bold text-cobrar-txt2 mb-1.5 tracking-wider">Cliente agendado (Opcional)</label>
              <select 
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cobrar-green/50 transition-colors text-white appearance-none cursor-pointer"
              >
                <option value="">Ninguno (Venta mostrador)</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.cuit ? `(${c.cuit})` : ''}</option>
                ))}
              </select>
              <div className="absolute right-4 bottom-3 pointer-events-none text-cobrar-txt2">
                ▼
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-head font-bold text-white">Resumen</h2>
              <span className="bg-cobrar-bg border border-cobrar-border px-2 py-1 rounded text-xs text-cobrar-txt2">
                {cart.length} items
              </span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-cobrar-txt2">Subtotal:</span>
                <span className="font-bold text-white">${total.toLocaleString('es-AR')}</span>
              </div>
              <div className="h-px bg-cobrar-border w-full"></div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-cobrar-txt2">Total:</span>
                <span className="font-head font-bold text-3xl text-cobrar-green leading-none">
                  ${total.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="mt-auto space-y-3">
              <button 
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0 || processing}
                className="w-full bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-[#5252ff] flex justify-center items-center gap-2 shadow-[0_4px_20px_rgba(82,82,255,0.2)]"
              >
                <Wallet size={18} /> Procesar Venta
              </button>
              
              <button className="w-full bg-cobrar-bg border border-cobrar-border text-cobrar-txt2 font-medium py-3 rounded-xl hover:text-white hover:bg-cobrar-bg2 transition-all flex justify-center items-center gap-2 text-sm">
                % Gestionar Extras
              </button>
            </div>
          </div>
          
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-[#5252ff]/30 rounded-3xl w-full max-w-[450px] overflow-hidden shadow-2xl relative">
            
            <div className="p-6 border-b border-cobrar-border bg-cobrar-bg2">
              <h2 className="text-xl font-head font-bold text-white mb-1">Finalizar Venta</h2>
              <div className="flex justify-between items-center">
                <p className="text-sm text-cobrar-txt2">Total a cobrar:</p>
                <span className="text-2xl font-bold text-cobrar-green">${total.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-white mb-3 uppercase tracking-wider text-center">Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      paymentMethod === 'efectivo' ? 'bg-[#5252ff]/20 border-[#5252ff] text-[#5252ff]' : 'bg-[#1a1a23] border-cobrar-border text-cobrar-txt2 hover:text-white hover:border-[#5252ff]/50'
                    }`}
                  >
                    <Wallet size={20} className="mb-2" />
                    <span className="text-xs font-bold">Efectivo</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('tarjeta')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      paymentMethod === 'tarjeta' ? 'bg-[#5252ff]/20 border-[#5252ff] text-[#5252ff]' : 'bg-[#1a1a23] border-cobrar-border text-cobrar-txt2 hover:text-white hover:border-[#5252ff]/50'
                    }`}
                  >
                    <CreditCard size={20} className="mb-2" />
                    <span className="text-xs font-bold">Tarjeta</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      paymentMethod === 'transferencia' ? 'bg-[#5252ff]/20 border-[#5252ff] text-[#5252ff]' : 'bg-[#1a1a23] border-cobrar-border text-cobrar-txt2 hover:text-white hover:border-[#5252ff]/50'
                    }`}
                  >
                    <Smartphone size={20} className="mb-2" />
                    <span className="text-xs font-bold">Transf.</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'efectivo' && (
                <div className="bg-[#1a1a23] p-4 rounded-xl border border-cobrar-border animate-in fade-in slide-in-from-top-4">
                  <label className="block text-xs font-bold text-white mb-2">¿Con cuánto paga?</label>
                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-cobrar-txt2 font-bold">$</span>
                    <input 
                      type="number"
                      min={total}
                      step="0.01"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      placeholder={total.toString()}
                      className={`w-full bg-[#0f0f13] border rounded-xl py-3 pl-8 pr-4 text-white text-lg font-bold focus:outline-none transition-colors ${paymentMethod === 'efectivo' && Number(amountTendered) > 0 && Number(amountTendered) < total ? 'border-red-500 focus:border-red-500' : 'border-cobrar-border focus:border-[#5252ff]'}`}
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-cobrar-border/50">
                    <span className="text-sm font-bold text-cobrar-txt2">Vuelto a entregar:</span>
                    <span className={`text-xl font-bold ${change > 0 ? 'text-cobrar-green' : 'text-cobrar-txt3'}`}>
                      ${change.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-cobrar-border bg-[#0f0f13] flex gap-3">
              <button 
                onClick={() => setShowCheckout(false)}
                className="flex-1 bg-transparent hover:bg-cobrar-bg2 border border-cobrar-border text-white font-medium py-3.5 rounded-xl transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCheckout}
                disabled={processing || (paymentMethod === 'efectivo' && Number(amountTendered) > 0 && Number(amountTendered) < total)}
                className="flex-[2] bg-[#5252ff] hover:bg-[#6666ff] disabled:opacity-50 disabled:hover:bg-[#5252ff] text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-[0_4px_15px_rgba(82,82,255,0.3)] flex justify-center items-center gap-2"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Cobro'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
