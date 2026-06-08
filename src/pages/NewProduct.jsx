import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function NewProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    provider: '',
    unitType: 'Unitario',
    isActive: true,
    stock: 0,
    icon: '📦',
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
    
    // Fetch categories for autocompletion
    const fetchCategories = async () => {
      try {
        const { data } = await supabase.from('products').select('category').not('category', 'is', null);
        if (data) {
          const uniqueCats = [...new Set(data.map(d => d.category).filter(Boolean))];
          setExistingCategories(uniqueCats);
        }
      } catch (e) {}
    };
    
    const fetchProviders = async () => {
      try {
        const { data } = await supabase.from('providers').select('id, nombre').order('nombre');
        if (data) setProviders(data);
      } catch (e) {}
    };
    
    fetchCategories();
    fetchProviders();
  }, [user]);

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
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);

      setFormData(prev => ({...prev, icon: data.publicUrl}));
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Hubo un error al subir la imagen. Asegúrate de haber ejecutado el SQL para crear el bucket "product_images".');
    } finally {
      setIsUploading(false);
    }
  };

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

  const getUnitName = () => {
    switch (formData.unitType) {
      case 'kg': return 'kilo';
      case 'gr': return 'gramo';
      case 'litros': return 'litro';
      case 'ml': return 'mililitro';
      default: return 'unidad';
    }
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
          category: formData.category || 'Otros',
          unit: formData.unitType,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          icon: formData.icon || '📦',
          provider_id: formData.provider || null,
          user_id: user.id
        }]);

      if (error) throw error;
      
      toast.success('Producto creado exitosamente');
      navigate('/inventory');
      
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-cobrar-bg overflow-y-auto">
      {/* Header */}
      <div className="bg-cobrar-bg2 border-b border-cobrar-border p-4 md:p-6 sticky top-0 z-10">
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
      <div className="p-4 md:p-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl p-4 md:p-8 shadow-lg">
          
          <h2 className="text-lg font-head font-bold text-white mb-2">Información del producto</h2>
          <p className="text-sm text-cobrar-txt2 mb-6">Gestión de productos y precios</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Categoría</label>
              {isNewCategory ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Escribí la nueva categoría..."
                    className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
                    autoFocus
                  />
                  <button 
                    type="button" 
                    onClick={() => { setIsNewCategory(false); setFormData(p => ({...p, category: ''})); }} 
                    className="px-4 bg-cobrar-bg2 border border-cobrar-border rounded-xl text-cobrar-txt2 hover:text-white transition-colors"
                  >
                    X
                  </button>
                </div>
              ) : (
                <select
                  name="category"
                  value={formData.category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsNewCategory(true);
                      setFormData(p => ({...p, category: ''}));
                    } else {
                      handleChange(e);
                    }
                  }}
                  className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors appearance-none"
                >
                  <option value="">Seleccionar categoría...</option>
                  {existingCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
                  <option value="__NEW__">+ Crear nueva categoría...</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Proveedor</label>
              <select
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors appearance-none"
              >
                <option value="">-- Sin proveedor --</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
            <div className="w-20 shrink-0 flex flex-col gap-2">
              <label className="block text-xs font-bold text-white mb-0 text-center" title="Adjunta una imagen o usa un Emoji">Imagen</label>
              <div className="relative group w-20 h-20 bg-cobrar-bg border border-dashed border-cobrar-border hover:border-cobrar-green/50 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer transition-colors">
                {isUploading ? (
                  <Loader2 size={24} className="text-cobrar-green animate-spin" />
                ) : formData.icon?.startsWith('http') ? (
                  <>
                    <img src={formData.icon} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <Upload size={20} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center mt-1">
                    <span className="text-3xl mb-1 leading-none">{formData.icon || '📦'}</span>
                    <span className="text-[9px] text-cobrar-txt2 uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100 absolute bottom-2">Subir</span>
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
                value={formData.icon?.startsWith('http') ? '' : formData.icon}
                onChange={(e) => setFormData(p => ({...p, icon: e.target.value}))}
                placeholder="o Emoji"
                maxLength={2}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-lg py-1 px-1 text-center text-xs focus:outline-none focus:border-cobrar-green/50 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Unidad de medida</label>
              <select 
                name="unitType"
                value={formData.unitType}
                onChange={handleChange}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors appearance-none"
              >
                <option value="unidades">Unidades (u)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="gr">Gramos (gr)</option>
                <option value="litros">Litros (L)</option>
                <option value="ml">Mililitros (ml)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 border-t border-cobrar-border pt-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Cantidad disponible en {formData.unitType === 'unidades' ? 'unidades' : formData.unitType} *
              </label>
              <input 
                type="number" 
                name="stock"
                required
                min="0"
                value={formData.stock}
                onChange={handleChange}
                className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cobrar-green/50 transition-colors"
              />
              <p className="text-xs text-cobrar-txt2 mt-2">Usá la unidad real seleccionada para el stock.</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 border-t border-cobrar-border pt-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Costo (Precio por {getUnitName()})</label>
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
              <label className="block text-sm font-medium text-white mb-2">Precio final (Precio por {getUnitName()}) *</label>
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

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-4 border-t border-cobrar-border pt-6 mt-8">
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-white hover:bg-cobrar-bg2 transition-colors border border-transparent hover:border-cobrar-border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto justify-center bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold px-8 py-3 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_4px_20px_rgba(82,82,255,0.2)]"
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
