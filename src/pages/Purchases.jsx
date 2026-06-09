import { useState, useEffect } from 'react';
import { Search, Plus, ShoppingBag, X, Loader2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Purchases() {
  const { user, owner_id } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [isNewProviderMode, setIsNewProviderMode] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');

  // New Purchase state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [costo, setCosto] = useState(0);
  const [unidad, setUnidad] = useState('Unidad');
  const [updatePrices, setUpdatePrices] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [barcodeInput, setBarcodeInput] = useState('');
  
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [newProductName, setNewProductName] = useState('');

  const [precioPublico, setPrecioPublico] = useState('');
  const [productIcon, setProductIcon] = useState('📦');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPurchases();
      fetchProducts();
      fetchProviders();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`*, products (name), providers (nombre)`)
        .eq('user_id', owner_id)
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
        .select('id, name, stock, price, icon, code')
        .eq('user_id', owner_id)
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('id, nombre')
        .eq('user_id', owner_id)
        .order('nombre');
      if (!error && data) setProviders(data);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen.');
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${owner_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);

      setProductIcon(data.publicUrl);
    } catch (err) {
      console.error('Error in upload:', err);
      toast.error('Hubo un error al subir la imagen. Asegúrate de haber ejecutado el SQL para crear el bucket "product_images".');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegisterPurchase = async () => {
    setErrorMsg('');
    if (!selectedProductId && (!isNewProductMode || !newProductName.trim())) {
      setErrorMsg('Selecciona un producto o ingresa el nombre del nuevo.');
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

    try {
      let finalProductId = selectedProductId;

      let finalProviderId = providerId;

      // -1. Si es modo nuevo proveedor, lo creamos primero
      if (isNewProviderMode && newProviderName.trim()) {
        const { data: newProv, error: provError } = await supabase.from('providers').insert([{
          nombre: newProviderName.trim(),
          user_id: owner_id
        }]).select().single();
        
        if (provError) throw provError;
        finalProviderId = newProv.id;
        setProviders(prev => [...prev, newProv]);
      }

      // 0. Si es modo nuevo, creamos el producto primero
      if (isNewProductMode) {
        const { data: newProd, error: newProdError } = await supabase.from('products').insert([{
          name: newProductName,
          code: barcodeInput || '',
          price: Number(precioPublico) || (Number(costo) * 1.3),
          stock: 0, // Se actualizará en el paso 2 con la compra
          icon: productIcon || '📦',
          provider_id: finalProviderId || null,
          unit: unidad,
          user_id: owner_id
        }]).select().single();

        if (newProdError) throw newProdError;
        finalProductId = newProd.id;
        
        // Agregar al estado local de productos (con stock 0 temporal, luego se actualiza)
        setProducts(prev => [...prev, newProd]);
      }

      // 1. Insert Purchase
      const { data: newPurchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          user_id: owner_id,
          employee_id: user.id,
          product_id: finalProductId,
          cantidad: Number(cantidad),
          costo_unitario: Number(costo),
          subtotal: subtotal,
          unidad_medida: unidad,
          provider_id: finalProviderId || null
        }])
        .select(`*, products (name), providers (nombre)`);

      if (purchaseError) throw purchaseError;

      // 2. Update Product Stock (and optionally Price/Icon)
      // Necesitamos buscar el producto actualizado de la lista o el recién creado
      const selectedProduct = products.find(p => p.id === finalProductId) || { stock: 0, icon: productIcon };
      
      const newStock = Number(selectedProduct.stock || 0) + Number(cantidad);
      const updatePayload = { stock: newStock };
      
      if (productIcon && productIcon !== selectedProduct.icon) {
        updatePayload.icon = productIcon;
      }
      
      if (precioPublico && Number(precioPublico) > 0) {
        updatePayload.price = Number(precioPublico);
      }

      const { data: updatedProdData, error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', finalProductId)
        .select();

      if (updateError) throw updateError;
      if (!updatedProdData || updatedProdData.length === 0) {
         throw new Error('El producto no pudo actualizarse. Puede que no tengas permisos para modificarlo.');
      }

      // Registrar movimiento de stock
      await supabase.from('stock_movements').insert([{
        user_id: owner_id,
        product_id: finalProductId,
        tipo: 'entrada',
        cantidad: Number(cantidad),
        motivo: 'Compra de stock'
      }]);

      // 3. Update local state
      setPurchases(prev => [newPurchase[0], ...prev]);
      setProducts(prev => prev.map(p => p.id === finalProductId ? { ...p, ...updatePayload } : p));
      
      // Close modal and reset
      setShowModal(false);
      setSelectedProductId('');
      setBarcodeInput('');
      setCantidad(1);
      setCosto(0);
      setPrecioPublico('');
      setProviderId('');
      setIsNewProviderMode(false);
      setNewProviderName('');
      setProductIcon('📦');
      setIsNewProductMode(false);
      setNewProductName('');
      toast.success('Compra registrada correctamente');

    } catch (error) {
      console.error('Error registrando compra:', error);
      toast.error('Hubo un error al registrar la compra.');
    } finally { }
  };

  const filteredPurchases = purchases.filter(p => 
    p.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-bg overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Compras</h1>
          <p className="text-sm text-muted">Gestiona el historial de compras y mantené actualizado tu inventario.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            disabled
            className="bg-surface-2 border border-border text-muted font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 w-full sm:w-auto cursor-not-allowed opacity-70"
            title="Función disponible próximamente en el Plan IA"
          >
            <span className="text-[10px] bg-brand/20 text-brand font-bold px-1.5 py-0.5 rounded uppercase tracking-widest mr-1">Pronto</span>
            Escaneo de Factura IA
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand hover:bg-brand-hover text-text font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} /> Nueva compra
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-surface-2 border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por producto, unidad o usuario..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
        </div>

        <div className="p-4 md:p-6 border-b border-border bg-surface">
          <h3 className="font-bold text-text text-sm">Historial de compras</h3>
          <p className="text-xs text-muted mt-1">Consulta las compras registradas y editalas cuando sea necesario.</p>
        </div>

        <div className="flex-1 overflow-auto overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="bg-surface sticky top-0 z-10">
              <tr>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Producto</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Fecha</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Unidad</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Costo unitario</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-center">Cantidad</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Subtotal</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Loader2 className="animate-spin text-brand mx-auto" size={32} />
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-dim text-sm">
                    No encontramos compras para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                    <td className="px-4 py-4 font-bold text-text">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-2 border border-border flex items-center justify-center shrink-0 overflow-hidden text-lg">
                          {p.products?.icon?.startsWith('http') ? (
                            <img src={p.products.icon} alt={p.products.name} className="w-full h-full object-cover" />
                          ) : (
                            p.products?.icon || '📦'
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span>{p.products?.name || 'Desconocido'}</span>
                          {p.providers?.nombre && <span className="text-xs text-dim font-normal">Prov: {p.providers.nombre}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted">{new Date(p.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-muted">{p.unidad_medida}</td>
                    <td className="px-4 py-4 text-right text-muted">${Number(p.costo_unitario).toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-bold text-text">{p.cantidad}</td>
                    <td className="px-4 py-4 text-right font-bold text-brand">${Number(p.subtotal).toLocaleString()}</td>
                    <td className="px-4 py-4 text-muted">Vos</td>
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
          <div className="bg-bg border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-dim hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-4 md:p-6 border-b border-border bg-surface">
              <h2 className="text-lg font-display font-bold text-text mb-1">Nueva compra</h2>
              <p className="text-sm text-muted">Registrá la compra para sumar stock automáticamente.</p>
            </div>

            <div className="p-4 md:p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-medium text-text mb-2">Escanear o Escribir Código de Barras</label>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Escaneá o escribí el código..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const code = barcodeInput.trim();
                        if (!code) return;
                        const match = products.find(p => p.code === code);
                        if (match) {
                          setSelectedProductId(match.id);
                          setProductIcon(match.icon || '📦');
                          setPrecioPublico(match.price || '');
                          setIsNewProductMode(false);
                          setBarcodeInput(match.code || '');
                        } else {
                          setIsNewProductMode(true);
                          setSelectedProductId('');
                          setProductIcon('📦');
                          setPrecioPublico('');
                          setNewProductName('');
                        }
                      }
                    }}
                    className="flex-1 bg-bg border border-cobrar-green/30 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-cobrar-green text-text transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const code = barcodeInput.trim();
                      if (!code) return;
                      const match = products.find(p => p.code === code);
                      if (match) {
                        setSelectedProductId(match.id);
                        setProductIcon(match.icon || '📦');
                        setPrecioPublico(match.price || '');
                        setIsNewProductMode(false);
                        setBarcodeInput(match.code || '');
                      } else {
                        setIsNewProductMode(true);
                        setSelectedProductId('');
                        setProductIcon('📦');
                        setPrecioPublico('');
                        setNewProductName('');
                      }
                    }}
                    className="bg-brand/20 hover:bg-brand/30 text-brand border border-cobrar-green/50 font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-2">O seleccionar manualmente</label>
                <div className="relative">
                  <select 
                    value={isNewProductMode ? '__NEW__' : selectedProductId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__NEW__') {
                        setIsNewProductMode(true);
                        setSelectedProductId('');
                        setProductIcon('📦');
                        setPrecioPublico('');
                        setNewProductName('');
                        setBarcodeInput('');
                        setProviderId('');
                        setIsNewProviderMode(false);
                        setNewProviderName('');
                      } else {
                        setSelectedProductId(val);
                        setIsNewProductMode(false);
                        const p = products.find(prod => prod.id === val);
                        if (p) {
                          setProductIcon(p.icon || '📦');
                          setPrecioPublico(p.price || '');
                          setBarcodeInput(p.code || '');
                        }
                      }
                    }}
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                  >
                    <option value="" disabled={isNewProductMode}>Selecciona un producto...</option>
                    <option value="__NEW__" className="text-brand font-bold">+ Crear Producto Nuevo</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {(selectedProductId || isNewProductMode) && (
                <div className="flex flex-col gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                  {isNewProductMode && (
                    <div>
                      <label className="block text-xs font-bold text-brand mb-2">Nombre del Nuevo Producto *</label>
                      <input 
                        type="text" 
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Ej. Alfajor Havanna"
                        className="w-full bg-surface-2 border border-brand/50 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text transition-colors"
                      />
                    </div>
                  )}

                  <div className="flex gap-4 items-start">
                  <div className="w-16 shrink-0 flex flex-col gap-2">
                    <label className="block text-xs font-medium text-text mb-0 text-center" title="Adjunta una imagen o usa un Emoji">Imagen</label>
                    <div className="relative group w-16 h-16 bg-surface-2 border border-dashed border-border hover:border-brand/50 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-colors">
                      {isUploading ? (
                        <Loader2 size={20} className="text-brand animate-spin" />
                      ) : productIcon.startsWith('http') ? (
                        <>
                          <img src={productIcon} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <Upload size={16} className="text-text" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center mt-1">
                          <span className="text-2xl mb-1 leading-none">{productIcon || '📦'}</span>
                          <span className="text-[8px] text-muted uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100 absolute bottom-1">Subir</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Subir foto del producto"
                      />
                    </div>
                    <input 
                      type="text"
                      value={productIcon.startsWith('http') ? '' : productIcon}
                      onChange={(e) => setProductIcon(e.target.value)}
                      placeholder="o Emoji"
                      maxLength={2}
                      className="w-16 bg-surface-2 border border-border rounded-lg py-1 px-1 text-center text-[10px] focus:outline-none focus:border-brand/50 text-text"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-text mb-2">Proveedor de esta compra</label>
                    <select
                      value={isNewProviderMode ? '__NEW__' : providerId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__NEW__') {
                          setIsNewProviderMode(true);
                          setProviderId('');
                        } else {
                          setIsNewProviderMode(false);
                          setProviderId(val);
                        }
                      }}
                      className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                    >
                      <option value="">-- Sin proveedor --</option>
                      <option value="__NEW__" className="text-brand font-bold">+ Agregar Proveedor Nuevo</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    {isNewProviderMode && (
                      <input 
                        type="text" 
                        value={newProviderName}
                        onChange={(e) => setNewProviderName(e.target.value)}
                        placeholder="Nombre del nuevo proveedor"
                        className="w-full bg-bg border border-brand/50 rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text transition-colors mt-3 animate-in fade-in"
                      />
                    )}
                  </div>
                </div>
              </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-2">Cantidad</label>
                  <input 
                    type="number" 
                    value={cantidad}
                    onChange={(e) => {
                      setCantidad(e.target.value);
                      setErrorMsg('');
                    }}
                    min="1"
                    className={`w-full bg-surface-2 border rounded-lg py-2.5 px-4 text-sm focus:outline-none transition-colors ${errorMsg.includes('cantidad') ? 'border-red-500 focus:border-red-500 text-text' : 'border-brand/30 focus:border-brand text-text'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-2">Costo unitario ($)</label>
                  <input 
                    type="number" 
                    value={costo}
                    onChange={(e) => {
                      setCosto(e.target.value);
                      setErrorMsg('');
                    }}
                    min="0.01"
                    step="0.01"
                    className={`w-full bg-surface-2 border rounded-lg py-2.5 px-4 text-sm focus:outline-none transition-colors ${errorMsg.includes('costo') ? 'border-red-500 focus:border-red-500 text-text' : 'border-border focus:border-brand/50 text-text'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-2">Unidad de medida</label>
                  <select 
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors appearance-none"
                  >
                    <option>Unidad</option>
                    <option>Caja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-2">Fecha y hora</label>
                  <input 
                    type="datetime-local" 
                    className="w-full bg-surface-2 border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand/50 text-text transition-colors custom-date-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-2">Fecha de vencimiento (opcional)</label>
                <input 
                  type="date" 
                  value={fechaVencimiento}
                  onChange={(e) => {
                    setFechaVencimiento(e.target.value);
                    setErrorMsg('');
                  }}
                  className={`w-full bg-surface-2 border rounded-lg py-2.5 px-4 text-sm focus:outline-none transition-colors custom-date-input ${errorMsg.includes('vencimiento') || errorMsg.includes('pasado') ? 'border-red-500 focus:border-red-500 text-red-500' : 'border-border focus:border-brand/50 text-text'}`}
                />
              </div>

              {errorMsg && (
                <div className="text-red-400 text-xs font-medium">{errorMsg}</div>
              )}

              {(selectedProductId || isNewProductMode) && (
                <div className="bg-surface-2 border border-border p-4 rounded-lg mt-2 animate-in fade-in">
                  <label className="block text-xs font-bold text-text mb-2">Precio de Venta al Público ($)</label>
                  <input 
                    type="number" 
                    value={precioPublico}
                    onChange={(e) => setPrecioPublico(e.target.value)}
                    placeholder={isNewProductMode ? "Opcional. Se calcula +30% por defecto." : "Dejar en blanco para no modificar"}
                    className="w-full bg-bg border border-border rounded-lg py-2.5 px-4 text-sm focus:outline-none focus:border-brand text-text"
                  />
                  <p className="text-[11px] text-muted mt-2">
                    {isNewProductMode 
                      ? "Si lo dejas en blanco, se sumará un 30% al costo unitario para el precio de venta."
                      : "Ajusta el precio del catálogo usando los valores de esta compra. Si lo dejas vacío, mantenemos el precio actual."}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-bold text-text flex gap-2">
                Subtotal: <span className="text-brand">${(cantidad * costo).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text hover:bg-surface-2 border border-transparent hover:border-border rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRegisterPurchase}
                  className="bg-brand hover:bg-brand-hover text-text font-bold py-2 px-5 rounded-lg transition-all text-sm shadow-[0_4px_15px_rgba(82,82,255,0.3)]"
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
