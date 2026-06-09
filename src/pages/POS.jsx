import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, User, HelpCircle, LayoutGrid, Wallet, Lock, CreditCard, Smartphone, X, Settings } from 'lucide-react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { enqueueOfflineAction } from '../lib/offlineSync';
import toast from 'react-hot-toast';

export default function POS() {
  const { user, owner_id } = useAuth();
  const { isRegisterOpen, setShowCashModal, setCashAction, cashAmount, setCashAmount, showHelpMenu, setShowHelpMenu } = useOutletContext();
  
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [ivaCondition, setIvaCondition] = useState('Consumidor Final');
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cobrar_pos_cart') || '[]');
    } catch {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // efectivo, tarjeta, transferencia
  const [amountTendered, setAmountTendered] = useState('');
  const [storeSettings, setStoreSettings] = useState(null);

  // Custom Amount Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  // New Client Modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const searchInputRef = useRef(null);

  // Sync cart to local storage
  useEffect(() => {
    localStorage.setItem('cobrar_pos_cart', JSON.stringify(cart));
  }, [cart]);

  // Auto-focus search input on any key press (useful for barcode scanners)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // If user is already typing in an input or textarea, don't steal focus
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Only steal focus for printable characters or Enter
      if (e.key.length === 1 || e.key === 'Enter') {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const printReceipt = (saleId, cartToPrint, total, payMethod, settings) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast.error('Ventana emergente bloqueada. Habilitalas para imprimir recibos.');
      return;
    }

    const storeName = settings?.store_name || 'Mi Comercio';
    const dateStr = new Date().toLocaleString('es-AR');
    const shortSaleId = String(saleId).split('-')[0];
    
    let itemsHtml = '';
    cartToPrint.forEach(item => {
      const itemTotal = item.product.price * item.qty;
      itemsHtml += `
        <div class="item">
          <div class="item-name">${item.product.name}</div>
          <div class="item-details">
            <span>${item.qty} x $${item.product.price.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
            <span>$${itemTotal.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
          </div>
        </div>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket #${shortSaleId}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm; /* Standard thermal printer width */
            margin: 0 auto;
            padding: 0;
            color: #000;
            font-size: 12px;
          }
          .header { text-align: center; margin-bottom: 15px; }
          .header h1 { font-size: 16px; margin: 0 0 5px 0; font-weight: bold; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 10px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { margin-bottom: 5px; }
          .item-name { font-weight: bold; font-size: 11px; margin-bottom: 2px; line-height: 1.1; }
          .item-details { display: flex; justify-content: space-between; font-size: 11px; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          .disclaimer { text-align: center; margin-top: 15px; font-size: 9px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; line-height: 1.2; }
          @media print {
            html, body { width: 58mm; margin: 0; padding: 0; }
            @page { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${storeName}</h1>
          <p>Ticket #${shortSaleId}</p>
          <p>${dateStr}</p>
        </div>
        
        <div class="divider"></div>
        
        ${itemsHtml}
        
        <div class="divider"></div>
        
        <div class="total-row">
          <span>TOTAL:</span>
          <span>$${total.toLocaleString('es-AR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
        </div>
        <div style="text-align: right; font-size: 10px; margin-top: 3px;">
          Medio de pago: ${payMethod.toUpperCase()}
        </div>
        
        <div class="footer">
          <p>¡Gracias por su compra!</p>
        </div>
        
        <div class="disclaimer">
          DOCUMENTO NO VÁLIDO COMO FACTURA
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for styles to apply before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', owner_id)
        .neq('active', false)  // Only show active products
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
        .eq('user_id', owner_id)
        .order('nombre');
      
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', owner_id)
        .single();
      
      if (!error && data) {
        setStoreSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    if (owner_id) {
      fetchProducts();
      fetchClients();
      fetchStoreSettings();
    }
  }, [owner_id]);

  const [showCategorySettings, setShowCategorySettings] = useState(false);

  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const visibleCategories = storeSettings?.pos_categories !== undefined
    ? allCategories.filter(c => storeSettings.pos_categories.includes(c))
    : allCategories;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.code && p.code.includes(searchTerm));
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

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

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  
  let finalTotal = subtotal;
  let activeDiscount = 0;
  let activeSurcharge = 0;

  if (storeSettings) {
    if (paymentMethod === 'efectivo') {
      if (storeSettings.cash_discount > 0) activeDiscount = subtotal * (storeSettings.cash_discount / 100);
      if (storeSettings.cash_surcharge > 0) activeSurcharge = subtotal * (storeSettings.cash_surcharge / 100);
    } else if (paymentMethod === 'transferencia') {
      if (storeSettings.transfer_discount > 0) activeDiscount = subtotal * (storeSettings.transfer_discount / 100);
      if (storeSettings.transfer_surcharge > 0) activeSurcharge = subtotal * (storeSettings.transfer_surcharge / 100);
    } else if (paymentMethod === 'tarjeta') {
      if (storeSettings.card_discount > 0) activeDiscount = subtotal * (storeSettings.card_discount / 100);
      if (storeSettings.card_surcharge > 0) activeSurcharge = subtotal * (storeSettings.card_surcharge / 100);
    }
    finalTotal = subtotal - activeDiscount + activeSurcharge;
  }

  const change = paymentMethod === 'efectivo' && amountTendered 
    ? Math.max(0, Number(amountTendered) - finalTotal) 
    : 0;

  const handleAgregarMontoCarrito = () => {
    const customProduct = {
      id: `custom-${Date.now()}`,
      name: customDesc || 'Varios',
      price: Number(customAmount),
      stock: 999,
      icon: '🛒'
    };
    addToCart(customProduct);
    setShowCustomModal(false);
    setCustomAmount('');
    setCustomDesc('');
  };

  const handleAbonarDeudaDirecto = async () => {
    if (!selectedClientId) return;
    setProcessing(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const paid = Number(customAmount);
      const currentDebt = Number(client?.deuda || 0);
      const newDebt = Math.max(0, currentDebt - paid);
      
      await supabase.from('clients').update({ deuda: newDebt }).eq('id', selectedClientId);
      
      const newCash = cashAmount + paid;
      await supabase.from('cash_movements').insert([{
        user_id: owner_id,
        employee_id: user.id,
        tipo: 'ingreso',
        monto: paid,
        motivo: `Abono de deuda - ${client?.nombre || 'Cliente'} (${customDesc || 'Ingreso manual'})`,
        saldo_anterior: cashAmount,
        saldo_nuevo: newCash
      }]);
      setCashAmount(newCash);
      
      toast.success(`Abono registrado. Deuda restante: $${newDebt.toLocaleString('es-AR')}`);
      setShowCustomModal(false);
      setCustomAmount('');
      setCustomDesc('');
      fetchClients();
    } catch (err) {
      toast.error('Error al registrar abono.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0 && !selectedClientId) return;
    
    if (paymentMethod === 'fiado' && !selectedClientId) {
      toast.error('Debe seleccionar un cliente para vender a Fiado');
      return;
    }

    // Validar monto si es efectivo
    if (paymentMethod === 'efectivo' && Number(amountTendered) < finalTotal) {
      toast.error("El monto ingresado es menor al total de la venta.");
      return;
    }

    try {
      setProcessing(true);

      // === OFFLINE QUEUE INTERCEPT ===
      if (!navigator.onLine) {
        enqueueOfflineAction('SALE', {
          cart,
          finalTotal,
          paymentMethod,
          selectedClientId,
          owner_id,
          user_id: user.id,
          cashAmount
        });
        
        if (paymentMethod === 'efectivo') {
          setCashAmount(cashAmount + finalTotal);
        } else if (cart.length === 0 && selectedClientId && finalTotal > 0) {
          const client = clients.find(c => c.id === selectedClientId);
          const currentDebt = Number(client?.deuda || 0);
          const paid = Math.min(finalTotal, currentDebt);
          setCashAmount(cashAmount + paid);
        }
        
        setCart([]);
        setShowCheckout(false);
        setAmountTendered('');
        toast.success(`Venta o Abono guardado localmente (Sin Conexión)`);
        setProcessing(false);
        return;
      }

      // === PAYMENT OF CLIENT DEBT (empty cart) ===
      if (cart.length === 0 && selectedClientId && finalTotal > 0) {
        const client = clients.find(c => c.id === selectedClientId);
        const currentDebt = Number(client?.deuda || 0);
        const paid = Math.min(finalTotal, currentDebt);
        const newDebt = Math.max(0, currentDebt - finalTotal);
        
        await supabase.from('clients').update({ deuda: newDebt }).eq('id', selectedClientId);
        
        const newCash = cashAmount + paid;
        await supabase.from('cash_movements').insert([{
          user_id: owner_id,
          employee_id: user.id,
          tipo: 'ingreso',
          monto: paid,
          motivo: `Abono de deuda - ${client?.nombre || 'Cliente'}`,
          saldo_anterior: cashAmount,
          saldo_nuevo: newCash
        }]);
        setCashAmount(newCash);
        
        setCart([]);
        setShowCheckout(false);
        setAmountTendered('');
        toast.success(`Abono registrado. Deuda restante: $${newDebt.toLocaleString('es-AR')}`);
        setProcessing(false);
        return;
      }
      
      if (cart.length === 0) {
        toast.error('El carrito está vacío.');
        setProcessing(false);
        return;
      }

      // === OFFLINE QUEUE INTERCEPT ===
      if (!navigator.onLine) {
        enqueueOfflineAction('SALE', {
          cart,
          finalTotal,
          paymentMethod,
          selectedClientId,
          owner_id,
          user_id: user.id,
          cashAmount
        });
        
        if (paymentMethod === 'efectivo') {
          setCashAmount(cashAmount + finalTotal);
        }
        
        setCart([]);
        setShowCheckout(false);
        setAmountTendered('');
        toast.success(`Venta guardada localmente (Sin Conexión)`);
        setProcessing(false);
        return;
      }

      const cartItemsPayload = cart.map(item => ({
        id: item.product.id,
        qty: item.qty,
        price: item.product.price,
        name: item.product.name
      }));
      const { data: rpcData, error: rpcError } = await supabase.rpc('process_sale', {
        p_user_id: owner_id,
        p_employee_id: user.id,
        p_payment_method: paymentMethod.toLowerCase(),
        p_total: finalTotal,
        p_cart_items: cartItemsPayload,
        p_client_id: selectedClientId || null
      });
      if (rpcError) throw rpcError;
      if (rpcData && rpcData.new_cash_balance !== undefined && paymentMethod.toLowerCase() === 'efectivo') {
        setCashAmount(rpcData.new_cash_balance);
      }
      const returnedSaleId = rpcData?.sale_id || '0000';
      setCart([]);
      setShowCheckout(false);
      setAmountTendered('');
      toast.success(`Venta registrada con éxito (#${returnedSaleId.split('-')[0]})`);
      printReceipt(returnedSaleId, cart, finalTotal, paymentMethod, storeSettings);
      fetchProducts();
    } catch (err) {
      console.error('Error during checkout:', err);
      toast.error('Hubo un error al procesar la venta.');
    } finally {
      setProcessing(false);
    }
  };

  if (!isRegisterOpen) {
    return (
      <div className="flex flex-col h-full bg-bg items-center justify-center p-8">
        <div className="bg-surface-2 border border-brand/30 rounded-3xl p-12 text-center max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-brand/5 blur-3xl pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-brand/20 text-brand rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10">
            <Lock size={40} />
          </div>
          
          <h1 className="text-3xl font-display font-bold text-text mb-3 relative z-10">Caja Cerrada</h1>
          <p className="text-muted mb-8 relative z-10 text-sm leading-relaxed">
            Para poder empezar a registrar ventas y movimientos, es necesario realizar la apertura de caja y definir tu monto inicial.
          </p>
          
          <button 
            onClick={() => {
              setCashAction('abrir');
              setShowCashModal(true);
            }}
            className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(82,82,255,0.3)] relative z-10 text-lg"
          >
            Abrir Caja Ahora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header POS */}
      <div className="flex justify-between items-center p-6 shrink-0 border-b border-border bg-surface">
        <div>
          <h1 className="text-xl font-display font-bold text-text">Punto de Venta</h1>
          <p className="text-sm text-muted">Sistema POS - Cobrar</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text transition-colors bg-bg px-3 py-1.5 rounded-lg border border-border">
            <LayoutGrid size={16} /> Tutorial
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowHelpMenu(prev => !prev)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg border ${
                showHelpMenu
                  ? 'bg-brand/10 text-brand border-brand/30'
                  : 'bg-bg text-muted hover:text-text border-border'
              }`}
            >
              <HelpCircle size={16} /> Ayuda <span className="bg-surface-2 px-1.5 py-0.5 rounded text-[10px] border border-border">F1</span>
            </button>
            {showHelpMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-bg border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                <Link
                  to="/faq"
                  onClick={() => setShowHelpMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-muted hover:bg-surface-2 hover:text-text transition-colors"
                >
                  <HelpCircle size={16} className="text-brand" />
                  Preguntas Frecuentes
                </Link>
                <div className="border-t border-border" />
                <a
                  href="https://wa.me/5491100000000?text=Hola,%20necesito%20soporte%20con%20Cobrar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-muted hover:bg-surface-2 hover:text-text transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.556-.764-6.348-2.111l-.443-.34-3.09 1.036 1.036-3.09-.34-.443A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                  Soporte (WhatsApp)
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-4 md:p-6 gap-6 overflow-y-auto lg:overflow-y-hidden">
        {/* LEFT COLUMN: Search & Cart */}
        <div className="w-full lg:flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Search Box */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 shrink-0">
            <h2 className="text-sm font-display font-bold text-text mb-3">Buscar Producto</h2>
            <p className="text-xs text-muted mb-4">Escanee código de barras o escriba el nombre del producto</p>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" size={18} />
                <input 
                  ref={searchInputRef}
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
                  className="w-full bg-bg border border-cobrar-green/30 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-cobrar-green transition-colors text-text placeholder:text-dim"
                  autoFocus
                />
                
                {/* Search Results Dropdown */}
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => { addToCart(p); setSearchTerm(''); setSelectedCategory(''); }}
                        className="w-full text-left px-4 py-3 hover:bg-surface-2 flex justify-between items-center border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{p.icon || '📦'}</span>
                          <div>
                            <div className="font-bold text-sm text-text">{p.name}</div>
                            {p.code && <div className="text-xs text-muted font-mono">{p.code}</div>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-brand text-sm">${p.price.toLocaleString('es-AR')}</div>
                          <div className="text-xs text-muted">Stock: {p.stock}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowCustomModal(true)}
                className="bg-surface border border-border text-text text-sm font-medium px-4 py-3 rounded-xl hover:bg-surface-2 transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Agregar Monto
              </button>
              <button 
                disabled
                className="bg-surface-2 border border-border text-muted text-sm font-bold px-4 py-3 rounded-xl transition-colors flex items-center gap-2 opacity-70 cursor-not-allowed"
                title="Soporte para balanzas disponible próximamente"
              >
                <span className="text-[10px] bg-brand/20 text-brand font-bold px-1.5 py-0.5 rounded uppercase tracking-widest hidden sm:inline-block">Pronto</span>
                ⚖️ Balanza
              </button>
            </div>
            
            {/* CATEGORIES CHIPS */}
            {allCategories.length > 0 && (
              <div className="flex gap-2 mt-4 overflow-x-auto custom-scrollbar pb-1">
                <button
                  onClick={() => setShowCategorySettings(true)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border bg-surface border-border text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center shrink-0"
                  title="Configurar accesos directos"
                >
                  <Settings size={18} />
                </button>
                <div className="w-px bg-border my-1 mx-1 shrink-0"></div>
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border shrink-0 ${
                    selectedCategory === '' 
                    ? 'bg-brand text-text border-brand' 
                    : 'bg-surface border-border text-muted hover:text-text hover:bg-surface-2'
                  }`}
                >
                  Todos
                </button>
                {visibleCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors border shrink-0 ${
                      selectedCategory === cat 
                      ? 'bg-brand text-text border-brand' 
                      : 'bg-surface border-border text-muted hover:text-text hover:bg-surface-2'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            
            {/* IN-POS PRODUCT GRID FOR SELECTED CATEGORY */}
            {(selectedCategory || (!searchTerm && filteredProducts.length > 0 && filteredProducts.length < 20)) && (
              <div className="mt-4 flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                {filteredProducts.slice(0, 50).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="shrink-0 w-[160px] bg-bg border border-border hover:border-brand/50 rounded-xl p-3 text-left transition-all hover:-translate-y-1 hover:shadow-lg group flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-2xl mb-2">{p.icon || '📦'}</div>
                      <div className="font-bold text-sm text-text leading-tight mb-1 group-hover:text-brand transition-colors whitespace-normal break-words line-clamp-2">{p.name}</div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <div className="font-bold text-text">${p.price.toLocaleString('es-AR')}</div>
                      <div className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">{p.stock} u</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* Cart List */}
          <div className="flex-1 bg-surface-2 border border-border rounded-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border shrink-0">
              <h2 className="text-sm font-display font-bold text-text">Carrito</h2>
              <p className="text-xs text-muted mt-1">
                {cart.length === 0 ? 'El carrito está vacío' : `${cart.length} productos en el carrito`}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-dim gap-3">
                  <ShoppingCart size={48} className="opacity-20" />
                  <div className="text-center">
                    <p className="font-medium text-text mb-1">Carrito vacío</p>
                    <p className="text-xs">Buscá productos para agregar al carrito</p>
                  </div>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="bg-surface p-4 rounded-xl border border-transparent hover:border-border flex items-center gap-4 group transition-colors">
                    <div className="w-10 h-10 bg-bg rounded-lg border border-border flex items-center justify-center text-xl shrink-0">
                      {item.product.icon || '📦'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-text truncate">{item.product.name}</h4>
                      <div className="text-muted text-[11px] mt-0.5">${item.product.price.toLocaleString('es-AR')} c/u</div>
                    </div>
                    
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex items-center gap-1 bg-bg rounded-lg border border-border p-1">
                        <button onClick={() => updateQty(item.product.id, -1)} className="p-1 hover:text-text text-muted transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center text-text">{item.qty}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} className="p-1 hover:text-text text-muted transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <div className="w-24 text-right">
                        <div className="font-bold text-brand">${(item.product.price * item.qty).toLocaleString('es-AR')}</div>
                      </div>
                      
                      <button 
                        onClick={() => removeItem(item.product.id)} 
                        className="p-2 text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
        <div className="w-full lg:w-[350px] flex flex-col gap-6 shrink-0">
          
          {/* Client Box */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5">
            <h2 className="text-sm font-display font-bold text-text flex items-center gap-2 mb-3">
              <User size={16} className="text-muted" /> Cliente
            </h2>
            <p className="text-xs text-muted mb-4">Ingresá los datos para la factura</p>
            
            <div className="relative mb-4">
              <label className="block text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">Condición IVA</label>
              <select 
                value={ivaCondition}
                onChange={(e) => setIvaCondition(e.target.value)}
                className="w-full bg-bg border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cobrar-green/50 transition-colors text-text appearance-none cursor-pointer"
              >
                <option value="Consumidor Final">Consumidor Final</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributo">Monotributo</option>
                <option value="Exento">Exento</option>
              </select>
              <div className="absolute right-4 bottom-3 pointer-events-none text-muted">
                ▼
              </div>
            </div>

            <div className="relative">
              <label className="block text-[10px] uppercase font-bold text-muted mb-1.5 tracking-wider">Cliente agendado (Opcional)</label>
              <select 
                value={selectedClientId}
                onChange={(e) => {
                  if (e.target.value === 'NEW_CLIENT') {
                    setShowNewClientModal(true);
                  } else {
                    setSelectedClientId(e.target.value);
                  }
                }}
                className="w-full bg-bg border border-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-cobrar-green/50 transition-colors text-text appearance-none cursor-pointer"
              >
                <option value="">Ninguno (Venta mostrador)</option>
                <option value="NEW_CLIENT" className="font-bold text-brand bg-surface-2">✚ Crear nuevo cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.cuit ? `(${c.cuit})` : ''}</option>
                ))}
              </select>
              <div className="absolute right-4 bottom-3 pointer-events-none text-muted">
                ▼
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-surface-2 border border-border rounded-2xl p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-display font-bold text-text">Resumen</h2>
              <span className="bg-bg border border-border px-2 py-1 rounded text-xs text-muted">
                {cart.length} items
              </span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal:</span>
                <span className="font-bold text-text">${subtotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </div>
              
              {activeDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand">Descuento ({paymentMethod}):</span>
                  <span className="font-bold text-brand">-${activeDiscount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {activeSurcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-400">Recargo ({paymentMethod}):</span>
                  <span className="font-bold text-red-400">+${activeSurcharge.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="h-px bg-cobrar-border w-full"></div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-muted">Total:</span>
                <span className="font-display font-bold text-3xl text-brand leading-none">
                  ${finalTotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-auto space-y-4 pt-4 border-t border-border/50">
              
              <div>
                <label className="block text-[10px] font-bold text-brand mb-2 uppercase tracking-wider">Método de Pago</label>
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${
                      paymentMethod === 'efectivo' ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <Wallet size={16} className="mb-1" />
                    <span className="text-[10px] font-bold">Efectivo</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('tarjeta')}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${
                      paymentMethod === 'tarjeta' ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <CreditCard size={16} className="mb-1" />
                    <span className="text-[10px] font-bold">Tarjeta</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${
                      paymentMethod === 'transferencia' ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <Smartphone size={16} className="mb-1" />
                    <span className="text-[10px] font-bold">QR / Transf.</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('fiado')}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all ${
                      paymentMethod === 'fiado' ? 'bg-brand/10 border-brand text-brand' : 'bg-surface-2 border-border text-muted hover:text-text hover:border-brand/50'
                    }`}
                  >
                    <User size={16} className="mb-1" />
                    <span className="text-[10px] font-bold">Fiado</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'efectivo' && cart.length > 0 && (
                <div className="bg-surface-2 p-3.5 rounded-xl border border-brand/30 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[11px] font-bold text-text mb-2 uppercase tracking-wider">¿Con cuánto paga?</label>
                  <div className="relative mb-3">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted font-bold">$</span>
                    <input 
                      type="number"
                      min={finalTotal}
                      step="0.01"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      placeholder={finalTotal.toString()}
                      className={`w-full bg-bg border rounded-lg py-2.5 pl-7 pr-3 text-text text-sm font-bold focus:outline-none transition-colors ${paymentMethod === 'efectivo' && Number(amountTendered) > 0 && Number(amountTendered) < finalTotal ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-brand'}`}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2.5 border-t border-border/50">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Vuelto a entregar:</span>
                    <span className={`text-base font-bold ${change > 0 ? 'text-brand' : 'text-dim'}`}>
                      ${change.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'fiado' && !selectedClientId && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] p-2 rounded-lg text-center font-bold animate-in fade-in">
                  ⚠️ Seleccioná un Cliente para Fiado
                </div>
              )}

              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0 || processing || (paymentMethod === 'efectivo' && Number(amountTendered) > 0 && Number(amountTendered) < finalTotal) || (paymentMethod === 'fiado' && !selectedClientId)}
                className="w-full bg-[#2563eb] hover:bg-[#3b82f6] text-text font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-[#2563eb] flex justify-center items-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.3)] text-lg"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : `Cobrar $${finalTotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
              </button>

              <div className="flex gap-2 pt-1">
                <button disabled className="flex-1 bg-transparent border border-border text-muted font-bold py-2 rounded-lg transition-all flex justify-center items-center gap-1.5 opacity-70 cursor-not-allowed">
                  <span className="text-[8px] bg-brand/20 text-brand font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">Pronto</span>
                  <span className="text-[10px]">Facturar AFIP</span>
                </button>
                <button disabled className="flex-1 bg-transparent border border-border text-muted font-bold py-2 rounded-lg transition-all flex justify-center items-center gap-1.5 opacity-70 cursor-not-allowed">
                  <span className="text-[10px]">% Extras</span>
                </button>
              </div>

            </div>
          </div>
          
        </div>
      </div>



      {/* Agregar Monto / Abonar Deuda Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-3xl w-full max-w-[400px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-surface flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-text">Agregar Monto</h2>
              <button onClick={() => setShowCustomModal(false)} className="text-muted hover:text-text"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text mb-2 uppercase">Monto ($)</label>
                <input type="number" min="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand" placeholder="0" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-2 uppercase">Detalle</label>
                <input type="text" value={customDesc} onChange={e => setCustomDesc(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand" placeholder="Ej: Varios / Abono" />
              </div>
              <div className="pt-4 flex gap-3">
                {selectedClientId ? (
                  <button 
                    onClick={handleAbonarDeudaDirecto}
                    disabled={!customAmount || Number(customAmount) <= 0 || processing}
                    className="flex-1 bg-brand hover:bg-emerald-500 text-text font-bold py-3 rounded-xl transition-all text-sm flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="animate-spin" size={16} /> : 'Abonar Deuda'}
                  </button>
                ) : null}
                <button 
                  onClick={handleAgregarMontoCarrito}
                  disabled={!customAmount || Number(customAmount) <= 0}
                  className="flex-[2] bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:hover:bg-brand text-text font-bold py-3 rounded-xl transition-all text-sm shadow-[0_4px_15px_rgba(82,82,255,0.3)] flex justify-center items-center gap-2"
                >
                  Agregar al Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo Cliente Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-3xl w-full max-w-[400px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-surface flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-text">Nuevo Cliente</h2>
              <button onClick={() => {
                setShowNewClientModal(false);
                setSelectedClientId('');
              }} className="text-muted hover:text-text"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text mb-2 uppercase tracking-wider">Nombre del Cliente *</label>
                <input 
                  type="text" 
                  value={newClientName} 
                  onChange={e => setNewClientName(e.target.value)} 
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors" 
                  placeholder="Ej: Juan Pérez" 
                  autoFocus 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-2 uppercase tracking-wider">Teléfono / WhatsApp (Opcional)</label>
                <input 
                  type="text" 
                  value={newClientPhone} 
                  onChange={e => setNewClientPhone(e.target.value)} 
                  className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors" 
                  placeholder="Ej: 351..." 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={async () => {
                    if (!newClientName) return;
                    setProcessing(true);
                    try {
                      const { data, error } = await supabase
                        .from('clients')
                        .insert([{
                          user_id: owner_id,
                          nombre: newClientName,
                          telefono: newClientPhone || null,
                          balance: 0
                        }])
                        .select()
                        .single();
                        
                      if (error) throw error;
                      
                      setClients(prev => [...prev, data].sort((a,b) => a.nombre.localeCompare(b.nombre)));
                      setSelectedClientId(data.id);
                      setShowNewClientModal(false);
                      setNewClientName('');
                      setNewClientPhone('');
                      toast.success('Cliente creado correctamente');
                    } catch (err) {
                      console.error(err);
                      toast.error('Error al guardar cliente');
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={!newClientName || processing}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.3)] flex justify-center items-center gap-2"
                >
                  {processing ? <Loader2 className="animate-spin" size={18} /> : 'Guardar y Seleccionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Settings Modal */}
      {showCategorySettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-3xl w-full max-w-[400px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border bg-surface flex justify-between items-center">
              <div>
                <h2 className="text-xl font-display font-bold text-text">Accesos Directos</h2>
                <p className="text-xs text-muted mt-1">Elegí qué categorías mostrar en la barra del POS.</p>
              </div>
              <button onClick={() => setShowCategorySettings(false)} className="text-muted hover:text-text"><X size={20}/></button>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2">
              {allCategories.map(cat => {
                const isVisible = visibleCategories.includes(cat);
                return (
                  <div key={cat} className="flex justify-between items-center bg-surface-2 border border-border rounded-xl p-3">
                    <span className="text-sm font-bold text-text">{cat}</span>
                    <button
                      onClick={async () => {
                        let newVisible = [...visibleCategories];
                        if (isVisible) {
                          newVisible = newVisible.filter(c => c !== cat);
                        } else {
                          newVisible.push(cat);
                        }
                        
                        setStoreSettings(prev => ({ ...prev, pos_categories: newVisible }));
                        
                        try {
                          await supabase
                            .from('store_settings')
                            .update({ pos_categories: newVisible })
                            .eq('user_id', owner_id);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isVisible ? 'bg-brand' : 'bg-surface border border-border'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                );
              })}
              {allCategories.length === 0 && (
                <p className="text-center text-sm text-muted py-4">No hay categorías disponibles.</p>
              )}
            </div>
            <div className="p-4 bg-surface border-t border-border">
              <button 
                onClick={() => setShowCategorySettings(false)}
                className="w-full bg-brand hover:bg-brand-hover text-text font-bold py-3 rounded-xl transition-all shadow-lg"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
