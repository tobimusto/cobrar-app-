import { useState, useEffect, useRef } from 'react';
import { Save, Store, Link as LinkIcon, ExternalLink, Copy, CheckCircle2, Trash2, Plus, Image as ImageIcon, Upload, X, Loader2, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import toast from 'react-hot-toast';

export default function OnlineStore() {
  const { user } = useAuth();
  const plan = usePlan();
  const [storeName, setStoreName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [storeId, setStoreId] = useState(null);
  const [promotions, setPromotions] = useState([
    { icon: "🔥", title: "3+ productos · 10% OFF", description: "Llevá 3 productos y obtené 10% OFF" },
    { icon: "🛒", title: "$50.000+ · Envío gratis", description: "Comprando más de $50.000" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    fetchStoreSettings();
  }, []);

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
        setStoreId(data.id);
        if (data.promotions && Array.isArray(data.promotions)) setPromotions(data.promotions);
      }
    } catch (err) {
      console.error('Error fetching store settings:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
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
      promotions,
      user_id: user?.id
    };
    try {
      if (storeId) {
        const { data: updatedData, error } = await supabase
          .from('store_settings').update(payload).eq('id', storeId).eq('user_id', user.id).select();
        if (error) throw error;
        if (!updatedData || updatedData.length === 0) {
          const { data: newData, error: insertError } = await supabase
            .from('store_settings').insert([payload]).select().single();
          if (insertError) throw insertError;
          if (newData) setStoreId(newData.id);
        }
      } else {
        const { data, error } = await supabase
          .from('store_settings').insert([payload]).select().single();
        if (error) throw error;
        if (data) setStoreId(data.id);
      }
      toast.success('Tienda guardada correctamente.');
    } catch (error) {
      if (error?.code === '23505') toast.error('Ese Link Personalizado ya está en uso. Elegí otro.');
      else toast.error(`Error al guardar: ${error?.message || 'Error desconocido'}`);
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
        let { width, height } = img;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (type === 'logo') setLogoUrl(dataUrl);
        else setBannerUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const catalogUrl = slug ? `${window.location.origin}/c/${slug}` : (storeId ? `${window.location.origin}/c/${storeId}` : '');
  const copyUrl = () => { if (catalogUrl) { navigator.clipboard.writeText(catalogUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const handleAddPromotion = () => setPromotions([...promotions, { icon: "🔥", title: "Nueva Promo", description: "Descripción de la promo" }]);
  const handleUpdatePromotion = (index, field, value) => { const p = [...promotions]; p[index][field] = value; setPromotions(p); };
  const handleDeletePromotion = (index) => setPromotions(promotions.filter((_, i) => i !== index));

  if (!plan.hasCatalog) {
    return (
      <div className="flex flex-col h-full bg-cobrar-bg items-center justify-center p-8 text-center animate-in fade-in">
        <Store size={64} className="text-[#ff5252] mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-white mb-2">Catálogo Online</h2>
        <p className="text-cobrar-txt2 max-w-md mb-6">Esta función está disponible a partir del Plan Pro. Mejorá tu plan para armar tu tienda pública y recibir pedidos por WhatsApp.</p>
        <button className="bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.2)]">
          Ver planes
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#ff5252]/20 to-[#ff5252]/5 rounded-xl flex items-center justify-center border border-[#ff5252]/20">
            <Globe size={20} className="text-[#ff5252]" />
          </div>
          <div>
            <h1 className="text-2xl font-head font-bold text-white">Mi Tienda Online</h1>
            <p className="text-cobrar-txt2 text-sm">Configurá tu catálogo público y recibí pedidos por WhatsApp.</p>
          </div>
        </div>
      </div>

      <div className="bg-cobrar-bg2 border border-cobrar-border rounded-2xl overflow-hidden mb-6">
        <div className="p-4 md:p-6 border-b border-cobrar-border flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Store size={20} className="text-[#ff5252]" /> Mi Catálogo Online
            </h2>
            <p className="text-sm text-cobrar-txt2 mt-1">
              Configurá tu tienda online pública para recibir pedidos directo por WhatsApp.
            </p>
          </div>
          {storeId && (
            <span className="bg-[#1a2f24] text-[#4ade80] text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">Activo</span>
          )}
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo & Banner */}
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 items-start">
            <div>
              <label className="block text-sm font-bold text-white mb-2">Logo del Negocio</label>
              <div
                className="w-24 h-24 rounded-full border-2 border-dashed border-cobrar-border flex items-center justify-center bg-[#1a1a23] cursor-pointer hover:border-[#ff5252] overflow-hidden group relative"
                onClick={() => logoInputRef.current.click()}
              >
                {logoUrl ? (
                  <><img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center"><Upload size={20} className="text-white" /></div></>
                ) : (<ImageIcon size={28} className="text-cobrar-txt3 group-hover:text-[#ff5252] transition-colors" />)}
                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-white mb-2">Banner (Portada)</label>
              <div
                className="w-full h-24 rounded-xl border-2 border-dashed border-cobrar-border flex items-center justify-center bg-[#1a1a23] cursor-pointer hover:border-[#ff5252] overflow-hidden group relative"
                onClick={() => bannerInputRef.current.click()}
              >
                {bannerUrl ? (
                  <><img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-80" /><div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center"><span className="text-white text-sm font-bold flex items-center gap-2"><Upload size={16} /> Cambiar Portada</span></div></>
                ) : (<div className="text-cobrar-txt3 flex items-center gap-2 group-hover:text-[#ff5252] transition-colors"><ImageIcon size={20} /><span className="text-sm font-medium">Subir imagen de portada</span></div>)}
                <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">Nombre del Comercio</label>
            <input type="text" placeholder="Ej: Kiosco Don Carlos" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#ff5252] transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-bold text-white mb-2">Número de WhatsApp</label>
            <input type="text" placeholder="Ej: 5491100000000" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#ff5252] transition-colors" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-white mb-2">Descripción breve (Opcional)</label>
            <textarea placeholder="Ej: El kiosco con el mayor surtido del barrio. Abierto 24hs." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#ff5252] transition-colors resize-none h-20" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-white mb-2">Link Personalizado (Slug)</label>
            <div className="flex items-center">
              <span className="bg-[#1a1a23] border border-cobrar-border border-r-0 rounded-l-xl py-3 px-4 text-cobrar-txt2 text-sm whitespace-nowrap">{window.location.origin}/c/</span>
              <input type="text" placeholder="kiosco-don-carlos" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="w-full bg-[#1a1a23] border border-cobrar-border rounded-r-xl py-3 px-4 text-white focus:outline-none focus:border-[#ff5252] transition-colors" />
            </div>
            <p className="text-xs text-cobrar-txt2 mt-2">Se autocompleta con tu nombre y teléfono. Usa letras, números y guiones.</p>
          </div>
        </div>

        {storeId && (
          <div className="p-4 md:p-6 pt-0">
            <label className="block text-sm font-bold text-white mb-2">Enlace de tu Catálogo</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 px-4 text-cobrar-txt1 flex items-center gap-2 overflow-hidden">
                <LinkIcon size={16} className="text-cobrar-txt3 flex-shrink-0" />
                <span className="truncate">{catalogUrl}</span>
              </div>
              <button onClick={copyUrl} className="bg-[#242430] hover:bg-[#2c2c3a] border border-cobrar-border text-white p-3 rounded-xl transition-colors shrink-0" title="Copiar enlace">
                {copied ? <CheckCircle2 size={20} className="text-[#4ade80]" /> : <Copy size={20} />}
              </button>
              <a href={catalogUrl} target="_blank" rel="noreferrer" className="bg-[#242430] hover:bg-[#2c2c3a] border border-cobrar-border text-white p-3 rounded-xl transition-colors shrink-0" title="Abrir catálogo">
                <ExternalLink size={20} />
              </a>
            </div>
          </div>
        )}

        {/* Promotions */}
        <div className="p-4 md:p-6 border-t border-cobrar-border/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-white">Promociones del Catálogo</h3>
            <button onClick={handleAddPromotion} className="bg-[#1a1a23] border border-[#ff5252]/20 hover:border-[#ff5252]/50 text-white font-bold py-1.5 px-4 rounded-xl transition-all flex items-center gap-2 text-sm">
              <Plus size={16} /> Agregar Promoción
            </button>
          </div>
          <div className="space-y-4">
            {promotions.map((promo, index) => (
              <div key={index} className="flex gap-3 bg-[#16161e] border border-cobrar-border p-4 rounded-xl items-start">
                <div className="w-16">
                  <label className="block text-xs text-cobrar-txt2 mb-1">Emoji</label>
                  <input type="text" value={promo.icon} maxLength={2} onChange={(e) => handleUpdatePromotion(index, 'icon', e.target.value)} className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg p-2 text-center text-white text-lg focus:outline-none focus:border-[#ff5252]" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs text-cobrar-txt2 mb-1">Título de la Promo</label>
                    <input type="text" placeholder="Ej: 3+ productos · 10% OFF" value={promo.title} onChange={(e) => handleUpdatePromotion(index, 'title', e.target.value)} className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#ff5252]" />
                  </div>
                  <div>
                    <label className="block text-xs text-cobrar-txt2 mb-1">Detalle / Descripción</label>
                    <input type="text" placeholder="Ej: Llevá 3 productos y obtené 10% OFF" value={promo.description} onChange={(e) => handleUpdatePromotion(index, 'description', e.target.value)} className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg p-2 text-sm text-white focus:outline-none focus:border-[#ff5252]" />
                  </div>
                </div>
                <button onClick={() => handleDeletePromotion(index)} className="text-cobrar-txt3 hover:text-red-400 p-2 rounded-lg transition-colors mt-5" title="Eliminar Promoción">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {promotions.length === 0 && <p className="text-sm text-cobrar-txt3 text-center py-4">No hay promociones activas.</p>}
          </div>
        </div>

        <div className="p-4 bg-cobrar-bg3 border-t border-cobrar-border flex justify-end">
          <button onClick={handleSave} disabled={isSaving} className="bg-[#ff5252] hover:bg-[#ff3333] disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-[0_4px_15px_rgba(255,82,82,0.2)]">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Tienda'}
          </button>
        </div>
      </div>
    </div>
  );
}
