import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function NewProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    provider: '',
    unitType: 'Unitario',
    isActive: true,
    stock: 0,
    stockAlert: 5,
    expiryDate: '',
    tax: 21,
    cost: 0,
    priceWithoutTax: 0,
    price: 0
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setFormData(prev => ({ ...prev, code: codeParam }));
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateFinalPrice = () => {
    // Just a helper for the UI, in MVP we'll just save the final price
    const cost = parseFloat(formData.cost) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const priceWithTax = cost * (1 + (tax / 100));
    setFormData(prev => ({
      ...prev,
      priceWithoutTax: cost,
      price: priceWithTax
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('products')
        .insert([{
          name: formData.name,
          code: formData.code,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          icon: '📦', // default for MVP
          user_id: user.id
        }]);

      if (error) throw error;
      
      alert('Producto creado exitosamente');
      navigate('/inventory');
      
    } catch (err) {
      console.error(err);
      alert('Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-cobrar-bg overflow-y-auto">
      {/* Header */}
      <div className="bg-cobrar-bg2 border-b border-cobrar-border p-6 sticky top-0 z-10">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 text-cobrar-txt2 hover:text-white transition-colors text-sm font-medium mb-4"
        >
          <ArrowLeft size={16} /> Volver a productos
        </button>
        <h1 className="text-2xl font-head font-bold text-white">Nuevo Producto</h1>
        <p className="text-sm text-cobrar-txt2">Crear un nuevo producto para tu catálogo</p>
      </div>

      {/* Form Content */}
      <div className="p-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl p-8 shadow-lg">
          
          <h2 className="text-lg font-head font-bold text-white mb-2">Información del producto</h2>
          <p className="text-sm text-cobrar-txt2 mb-6">Gestión de productos y precios</p>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Nombre del producto *</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Coca Cola 2.25L"
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Código/SKU *</label>
              <input 
                type="text" 
                name="code"
                required
                value={formData.code}
                onChange={handleChange}
                placeholder="Código único o de barras"
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6 border-t border-cobrar-border pt-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Stock actual (en unidades) *</label>
              <input 
                type="number" 
                name="stock"
                required
                min="0"
                value={formData.stock}
                onChange={handleChange}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
              />
              <p className="text-xs text-cobrar-txt2 mt-2">Usá la unidad real (u) para el stock disponible.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Alerta de stock</label>
              <input 
                type="number" 
                name="stockAlert"
                min="0"
                value={formData.stockAlert}
                onChange={handleChange}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8 border-t border-cobrar-border pt-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Costo (Precio unitario)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cobrar-txt2">$</span>
                <input 
                  type="number" 
                  name="cost"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={handleChange}
                  onBlur={calculateFinalPrice}
                  className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">IVA (%) *</label>
              <input 
                type="number" 
                name="tax"
                required
                min="0"
                value={formData.tax}
                onChange={handleChange}
                onBlur={calculateFinalPrice}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Precio final de venta *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cobrar-green font-bold">$</span>
                <input 
                  type="number" 
                  name="price"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full bg-cobrar-bg border border-cobrar-green/50 rounded-xl pl-8 pr-4 py-3 text-white font-bold focus:outline-none focus:border-cobrar-green transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t border-cobrar-border pt-6 mt-8">
            <button 
              type="button"
              onClick={() => navigate('/inventory')}
              className="px-6 py-3 rounded-xl font-medium text-white hover:bg-cobrar-bg2 transition-colors border border-transparent hover:border-cobrar-border"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_4px_20px_rgba(82,82,255,0.2)]"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />}
              Crear Producto
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
