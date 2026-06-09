import { useState, useEffect, useRef } from 'react';
import { Save, Clock, Store, Link as LinkIcon, ExternalLink, Copy, CheckCircle2, Trash2, Plus, Image as ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePlan } from '../hooks/usePlan';

export default function Settings() {
  const { user } = useAuth();
  const { planId, name: planName } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');
  const [estimatedMargin, setEstimatedMargin] = useState(30);
  
  // Catalog settings
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [slug, setSlug] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState('Negocio');
  
  // Negocio Settings
  const [cuit, setCuit] = useState('');
  const [country, setCountry] = useState('Argentina');
  const [businessType, setBusinessType] = useState('Otros');
  
  // POS Settings
  const [cardSurcharge, setCardSurcharge] = useState(0);
  const [cardDiscount, setCardDiscount] = useState(0);
  const [transferSurcharge, setTransferSurcharge] = useState(0);
  const [transferDiscount, setTransferDiscount] = useState(0);
  const [cashSurcharge, setCashSurcharge] = useState(0);
  const [cashDiscount, setCashDiscount] = useState(0);
  
  const [storeId, setStoreId] = useState(null);
  const [promotions, setPromotions] = useState([
    { icon: "🔥", title: "3+ productos · 10% OFF", description: "Llevá 3 productos y obtené 10% OFF" },
    { icon: "🛒", title: "$50.000+ · Envío gratis", description: "Comprando más de $50.000" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['Negocio', 'Horarios', 'POS', 'Plan'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/settings?tab=${tab}`, { replace: true });
  };

  const fetchStoreSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (data) {
        setStoreName(data.store_name || '');
        setWhatsappNumber(data.whatsapp_number || '');
        setDescription(data.description || '');
        setLogoUrl(data.logo_url || '');
        setBannerUrl(data.banner_url || '');
        setSlug(data.slug || '');
        setCuit(data.cuit || '');
        setCountry(data.country || 'Argentina');
        setBusinessType(data.business_type || 'Otros');
        setStoreId(data.id);
        if (data.promotions && Array.isArray(data.promotions)) {
          setPromotions(data.promotions);
        }
        setCardSurcharge(data.card_surcharge || 0);
        setCardDiscount(data.card_discount || 0);
        setTransferSurcharge(data.transfer_surcharge || 0);
        setTransferDiscount(data.transfer_discount || 0);
        setCashSurcharge(data.cash_surcharge || 0);
        setCashDiscount(data.cash_discount || 0);
        setEstimatedMargin(data.estimated_margin || 30);
        if (data.business_hours) {
          setOpeningTime(data.business_hours.opening || '08:00');
          setClosingTime(data.business_hours.closing || '20:00');
        }
      }
    } catch (err) {
      console.error('Error fetching store settings:', err);
    }
  };

  const handleSave = async () => {
    setSaveStatus({ type: '', message: '' });
    setIsSaving(true);
    
    // Auto-generate slug if empty
    let finalSlug = slug;
    if (!finalSlug && storeName && whatsappNumber) {
      finalSlug = `${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${whatsappNumber}`.substring(0, 50);
      setSlug(finalSlug);
    }
    
    const payload = { 
      store_name: storeName, 
      whatsapp_number: whatsappNumber,
      description,
      logo_url: logoUrl,
      banner_url: bannerUrl,
      slug: finalSlug || null,
      cuit,
      country,
      business_type: businessType,
      promotions: promotions,
      card_surcharge: Number(cardSurcharge),
      card_discount: Number(cardDiscount),
      transfer_surcharge: Number(transferSurcharge),
      transfer_discount: Number(transferDiscount),
      cash_surcharge: Number(cashSurcharge),
      cash_discount: Number(cashDiscount),
      estimated_margin: Number(estimatedMargin),
      business_hours: { opening: openingTime, closing: closingTime },
      user_id: user?.id
    };

    try {
      if (storeId) {
        const { data: updatedData, error } = await supabase
          .from('store_settings')
          .update(payload)
          .eq('id', storeId)
          .eq('user_id', user.id)
          .select();
        
        if (error) throw error;
        if (!updatedData || updatedData.length === 0) {
          // El registro existe pero no le pertenece al usuario o no se pudo actualizar.
          // Creamos uno nuevo forzosamente para este usuario.
          const { data: newData, error: insertError } = await supabase
            .from('store_settings')
            .insert([payload])
            .select()
            .single();
          if (insertError) throw insertError;
          if (newData) setStoreId(newData.id);
        }
      } else {
        const { data, error } = await supabase
          .from('store_settings')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setStoreId(data.id);
      }
      setSaveStatus({ type: 'success', message: 'Configuración guardada correctamente.' });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      if (error?.code === '23505') {
        setSaveStatus({ type: 'error', message: 'Ese Link Personalizado ya está en uso. Por favor, elegí otro.' });
      } else {
        setSaveStatus({ type: 'error', message: `Error al guardar: ${error?.message || 'Error desconocido'}` });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = type === 'logo' ? 400 : 1200;
        const MAX_HEIGHT = type === 'logo' ? 400 : 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (type === 'logo') setLogoUrl(dataUrl);
        else setBannerUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddPromotion = () => {
    setPromotions([...promotions, { icon: "🔥", title: "Nueva Promo", description: "Descripción de la promo" }]);
  };

  const handleUpdatePromotion = (index, field, value) => {
    const newPromotions = [...promotions];
    newPromotions[index][field] = value;
    setPromotions(newPromotions);
  };

  const handleDeletePromotion = (index) => {
    setPromotions(promotions.filter((_, i) => i !== index));
  };

  const catalogUrl = slug ? `${window.location.origin}/c/${slug}` : (storeId ? `${window.location.origin}/c/${storeId}` : '');

  const copyUrl = () => {
    if (catalogUrl) {
      navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-text mb-2">Configuración</h1>
        <p className="text-muted">Ajustá las preferencias de tu negocio y aplicación.</p>
        
        {saveStatus.message && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${saveStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-brand/10 text-brand border border-cobrar-green/20'}`}>
            {saveStatus.type === 'error' ? <X size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-sm font-bold">{saveStatus.message}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-4 sm:gap-8 border-b border-border mb-6 custom-scrollbar pb-2">
        {['Negocio', 'Horarios', 'POS', 'Plan'].map((tab) => (
          <button 
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-2 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab ? 'border-brand text-text' : 'border-transparent text-muted hover:text-text'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Horarios' && (
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
        <div className="p-4 md:p-6 border-b border-border">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <Clock size={20} className="text-brand" /> Horarios del Negocio
          </h2>
          <p className="text-sm text-muted mt-1">
            Se mostrará un recordatorio para abrir o cerrar la caja según estos horarios.
          </p>
        </div>
        
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-bold text-text mb-2">Horario de Apertura</label>
            <input 
              type="time" 
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text mb-2">Horario de Cierre</label>
            <input 
              type="time" 
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text mb-2">Margen Estimado (%)</label>
            <input 
              type="number" 
              min="0"
              max="100"
              value={estimatedMargin}
              onChange={(e) => setEstimatedMargin(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl py-3 px-4 text-text focus:outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
      )}

      {activeTab === 'POS' && (
      <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
        <div className="p-4 md:p-6 border-b border-border">
          <h2 className="text-lg font-bold text-text flex items-center gap-2">
            <CheckCircle2 size={20} className="text-brand" /> Recargos y Descuentos (POS)
          </h2>
          <p className="text-sm text-muted mt-1">
            Configurá los porcentajes que se aplicarán automáticamente al seleccionar un método de pago en el Punto de Venta.
          </p>
        </div>
        
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta */}
          <div className="bg-surface-2 p-4 rounded-xl border border-border">
            <h3 className="text-md font-bold text-text mb-4">💳 Tarjeta</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Recargo (%)</label>
                <input 
                  type="number" min="0" step="0.01" value={cardSurcharge} onChange={(e) => setCardSurcharge(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-text focus:border-brand outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Descuento (%)</label>
                <input 
                  type="number" min="0" step="0.01" value={cardDiscount} onChange={(e) => setCardDiscount(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-text focus:border-brand outline-none"
                />
              </div>
            </div>
          </div>
          
          {/* Transferencia */}
          <div className="bg-surface-2 p-4 rounded-xl border border-border">
            <h3 className="text-md font-bold text-text mb-4">📱 Transferencia</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Recargo (%)</label>
                <input 
                  type="number" min="0" step="0.01" value={transferSurcharge} onChange={(e) => setTransferSurcharge(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-text focus:border-brand outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Descuento (%)</label>
                <input 
                  type="number" min="0" step="0.01" value={transferDiscount} onChange={(e) => setTransferDiscount(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-text focus:border-brand outline-none"
                />
              </div>
            </div>
          </div>

          {/* Efectivo */}
          <div className="bg-surface-2 p-4 rounded-xl border border-border">
            <h3 className="text-md font-bold text-text mb-4">💵 Efectivo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Recargo (%)</label>
                <input 
                  type="number" min="0" step="0.01" value={cashSurcharge} onChange={(e) => setCashSurcharge(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-text focus:border-brand outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted mb-1">Descuento (%)</label>
                <input 
                  type="number" min="0" step="0.01" value={cashDiscount} onChange={(e) => setCashDiscount(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg p-2 text-text focus:border-brand outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            {isSaving ? 'Guardando...' : 'Guardar Cambios POS'}
          </button>
        </div>
      </div>
      )}

      {activeTab === 'Negocio' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border flex items-center gap-4">
              <div className="w-12 h-12 bg-brand rounded-lg flex items-center justify-center text-text font-bold text-xl uppercase">
                {storeName ? storeName.charAt(0) : 'N'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-text">{storeName || 'Mi Negocio'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-dim bg-surface-2 px-2 py-0.5 rounded border border-border">{user?.id?.substring(0,8)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-text mb-2">Nombre del Negocio</label>
                <input 
                  type="text" 
                  value={storeName} 
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-2">CUIT del Negocio</label>
                <input 
                  type="text" 
                  value={cuit} 
                  onChange={(e) => setCuit(e.target.value)}
                  placeholder="20-12345678-9"
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-2">País</label>
                <select 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors appearance-none"
                >
                  <option value="Argentina">Argentina</option>
                  <option value="Uruguay">Uruguay</option>
                  <option value="Chile">Chile</option>
                  <option value="Mexico">México</option>
                  <option value="Espana">España</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text mb-2">Tipo de negocio</label>
                <select 
                  value={businessType} 
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-text focus:border-brand outline-none transition-colors appearance-none"
                >
                  <option value="Kiosco">Kiosco</option>
                  <option value="Almacen">Almacén</option>
                  <option value="Farmacia">Farmacia</option>
                  <option value="Electronica">Electrónica</option>
                  <option value="Ropa">Ropa / Indumentaria</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>
            
            <div className="p-4 bg-surface-2 border-t border-border flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-red-500/20 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
            <div className="p-6 relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center shrink-0">
                <X size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-red-500 font-bold text-lg">Restablecer negocio</h3>
                <p className="text-sm text-muted mt-1">
                  Elimina productos, compras, clientes, ventas y datos relacionados. <strong>No borra usuarios, plan ni configuración.</strong> Esta acción <strong>no se puede deshacer.</strong>
                </p>
              </div>
              <button 
                onClick={() => toast('Próximamente: Esta función ejecutará el borrado de la base de datos.', { icon: '⚠️' })}
                className="w-full md:w-auto bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-6 rounded-lg transition-colors border border-red-500/20 whitespace-nowrap"
              >
                Restablecer negocio
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Plan' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <p className="text-xs font-bold tracking-widest text-brand uppercase mb-1">Plan Actual</p>
                <h2 className="text-2xl font-bold text-text mb-2">{planName}</h2>
                <p className="text-sm text-muted">La gestión de cambios y pagos se realiza desde el flujo formal de planes.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface-2 border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-dim uppercase tracking-wider mb-2">Renovación</p>
                <p className="font-bold text-text text-lg">Manual</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-dim uppercase tracking-wider mb-2">Vencimiento</p>
                <p className="font-bold text-text text-lg">14 de jun de 2026</p>
              </div>
              <div className="bg-surface-2 border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-dim uppercase tracking-wider mb-2">Días restantes</p>
                <p className="font-bold text-text text-lg">7 días</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <span className="bg-surface-2 px-2 py-1 rounded text-sm">$</span> Historial de pagos
              </h3>
            </div>
            <div className="p-6">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-text font-bold">ID</th>
                    <th className="pb-3 text-text font-bold">Fecha</th>
                    <th className="pb-3 text-text font-bold">Plan</th>
                    <th className="pb-3 text-text font-bold">Monto</th>
                    <th className="pb-3 text-text font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-dim">No hay pagos registrados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
