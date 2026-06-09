import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, Package, Upload, Download, X, HelpCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../hooks/usePlan';
import toast from 'react-hot-toast';

export default function Inventory() {
  const { user, owner_id } = useAuth();
  const plan = usePlan();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Providers State
  const [providers, setProviders] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', owner_id)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase.from('providers').select('id, nombre').eq('user_id', owner_id).order('nombre');
      if (!error && data) setProviders(data);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchProviders();
  }, []);

  const handleToggleActive = async (prod) => {
    const newActive = !(prod.active !== false); // treat null/undefined as true
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: newActive })
        .eq('id', prod.id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, active: newActive } : p));
      toast.success(newActive ? `"${prod.name}" activado` : `"${prod.name}" desactivado`);
    } catch (err) {
      toast.error('Error al cambiar estado del producto');
    }
  };

  const handleEditClick = (prod) => {
    setEditingProduct({ ...prod });
    setShowEditModal(true);
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

      setEditingProduct({...editingProduct, icon: data.publicUrl});
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Hubo un error al subir la imagen. Asegúrate de haber ejecutado el SQL para crear el bucket "product_images".');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          price: Number(editingProduct.price),
          stock: Number(editingProduct.stock),
          provider_id: editingProduct.provider_id || null,
          icon: editingProduct.icon
        })
        .eq('id', editingProduct.id)
        .select();
        
      if (error) throw error;
      if (!data || data.length === 0) {
         throw new Error('El producto no pudo actualizarse. Puede que no tengas permisos.');
      }
      
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...editingProduct, price: Number(editingProduct.price), stock: Number(editingProduct.stock) } : p));
      fetchProducts();
      toast.success('Producto actualizado correctamente');
    } catch (err) {
      console.error('Error saving product edits:', err);
      toast.error('Hubo un error al actualizar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code && p.code.includes(searchTerm))
  );

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Código', 'Nombre', 'Tipo', 'Categoría', 'Proveedor', 
      'Precio Costo', 'Precio Neto', 'Precio Bruto', 'IVA', 'Unidad', 
      'Imagen', 'Vencimiento', 'Stock Actual', 'Alerta Stock', 'Activo (SI/NO)', 
      'Variantes y Componentes'
    ];
    
    const rows = products.map(p => [
      p.code || '',
      p.name || '',
      'simple',
      '',
      '',
      '0',
      p.price || 0,
      p.price || 0,
      '21',
      'Unitario',
      p.icon || '📦',
      '',
      p.stock || 0,
      '5',
      'SI',
      ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `productos_exportados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Template
  const handleDownloadTemplate = () => {
    const headers = [
      'Código', 'Nombre', 'Tipo', 'Categoría', 'Proveedor', 
      'Precio Costo', 'Precio Neto', 'Precio Bruto', 'IVA', 'Unidad', 
      'Imagen', 'Vencimiento', 'Stock Actual', 'Alerta Stock', 'Activo (SI/NO)', 
      'Variantes y Componentes'
    ];
    
    const exampleRow = [
      '7790895000997', 'Coca Cola 2.25L', 'simple', 'Bebidas', 'Coca Cola Co.', 
      '1500', '1900', '1900', '21', 'Unitario', 
      '🥤', '', '24', '5', 'SI', 
      ''
    ];
    
    const csvContent = [
      headers.join(','),
      exampleRow.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_productos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV function
  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  // CSV Import handler
  const handleImportCSV = async (e) => {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsedLines = parseCSV(text);
        
        if (parsedLines.length < 2) {
          toast.error('El archivo CSV está vacío o tiene un formato incorrecto.');
          setImporting(false);
          return;
        }

        const headers = parsedLines[0].map(h => h.trim().toLowerCase());
        const idxCode = headers.indexOf('código');
        const idxName = headers.indexOf('nombre');
        const idxPriceNet = headers.indexOf('precio neto');
        const idxPriceGross = headers.indexOf('precio bruto');
        const idxStock = headers.indexOf('stock actual');
        const idxIcon = headers.indexOf('imagen');

        if (idxName === -1) {
          toast.error('El archivo CSV debe contener al menos la columna "Nombre".');
          setImporting(false);
          return;
        }

        const toInsert = [];
        const toUpdate = [];

        for (let i = 1; i < parsedLines.length; i++) {
          const row = parsedLines[i];
          if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

          const name = row[idxName];
          if (!name || name.trim() === '') continue;

          const code = idxCode !== -1 ? row[idxCode] : '';
          
          // find duplicate/match by code or name
          const match = products.find(p => (code && p.code === code) || p.name.toLowerCase() === name.toLowerCase());

          if (match) {
            toUpdate.push({
              id: match.id,
              name,
              code,
              price: parseFloat(row[7] || row[6] || 0) || 0,
              stock: parseInt(row[12] || 0, 10),
              icon: row[10] || '📦',
              category: row[3] || '',
              unit: row[9] || 'unidades',
              active: (row[14] || 'SI').toUpperCase() === 'SI',
              user_id: owner_id
            });
          } else {
            toInsert.push({
              name,
              code,
              price: parseFloat(row[7] || row[6] || 0) || 0,
              stock: parseInt(row[12] || 0, 10),
              icon: row[10] || '📦',
              user_id: owner_id
            });
          }
        }

        // execute insertions
        if (toInsert.length > 0) {
          const { error } = await supabase.from('products').insert(toInsert);
          if (error) throw error;
        }

        // execute updates
        if (toUpdate.length > 0) {
          for (const item of toUpdate) {
            const { error } = await supabase
              .from('products')
              .update({
                name: item.name,
                code: item.code,
                price: item.price,
                stock: item.stock,
                icon: item.icon
              })
              .eq('id', item.id);
            if (error) throw error;
          }
        }

        toast.success(`Importación completada. Creados: ${toInsert.length}, Actualizados: ${toUpdate.length}`);
        setShowImportModal(false);
        setSelectedFile(null);
        fetchProducts();

      } catch (err) {
        console.error('Error procesando CSV:', err);
        toast.error('Hubo un error al procesar el archivo CSV.');
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(selectedFile);
  };

  return (
    <div className="flex flex-col p-4 md:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center mb-8 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-text">Inventario</h2>
          <p className="text-muted text-sm mt-1">Gestiona tus productos y controla el stock</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button 
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto justify-center bg-surface-2 border border-border text-text hover:bg-surface font-bold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <Upload size={16} />
            Importar CSV
          </button>
          <button 
            onClick={handleExportCSV}
            className="w-full sm:w-auto justify-center bg-surface-2 border border-border text-text hover:bg-surface font-bold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button 
            onClick={() => {
              if (products.length >= plan.maxProducts) {
                toast.error(`Alcanzaste el límite de ${plan.maxProducts.toLocaleString('es-AR')} productos de tu plan. Mejorá tu plan para seguir agregando.`);
              } else {
                window.location.href = '/inventory/new';
              }
            }}
            className="w-full sm:w-auto justify-center bg-brand text-black font-bold py-2.5 px-5 rounded-xl hover:bg-[#05FF88] transition-all text-sm flex items-center gap-2 shrink-0"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        </div>
      </div>
      
      <div className="bg-surface-2 border border-border rounded-2xl flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-surface flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-bg border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cobrar-green/50 transition-colors"
            />
          </div>
          <div className="text-sm text-muted flex flex-col items-end">
            <div>
              <span className="font-bold text-text">{filteredProducts.length}</span> / {plan.maxProducts.toLocaleString('es-AR')} productos
            </div>
            {products.length >= plan.maxProducts && (
              <span className="text-xs text-[#ff5252] font-bold">Límite alcanzado</span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto pb-4">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="bg-surface sticky top-0 z-10">
              <tr>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Icono</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Producto</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Código</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Precio</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-center">Stock</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-center">Disponible</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-brand">
                    <Loader2 className="animate-spin mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-dim">
                    <Package size={32} className="mx-auto mb-3 opacity-50" />
                    No hay productos para mostrar
                  </td>
                </tr>
              ) : (
                filteredProducts.slice(0, 100).map(prod => (
                  <tr key={prod.id} className={`border-b border-border/50 hover:bg-surface transition-colors group ${prod.active === false ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <div className="w-10 h-10 bg-bg rounded-lg border border-border flex items-center justify-center text-xl overflow-hidden shrink-0">
                        {prod.icon?.startsWith('http') ? (
                          <img src={prod.icon} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          prod.icon || '📦'
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-text">
                      <div className="flex items-center gap-2">
                        {prod.name}
                        {plan.hasLowRotationAlerts && prod.stock > 0 && new Date() - new Date(prod.updated_at || prod.created_at || Date.now()) > 30*24*60*60*1000 && (
                          <span className="inline-flex items-center gap-1 bg-[#ff5252]/10 text-[#ff5252] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#ff5252]/20" title="Sin movimiento en más de 30 días">
                            <AlertTriangle size={10} /> Baja Rotación
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted text-sm">{prod.code || '-'}</td>
                    <td className="p-4 text-right font-bold text-brand whitespace-nowrap">${prod.price.toLocaleString('es-AR')}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${prod.stock < 10 ? 'bg-cobrar-orange/20 text-warning' : 'bg-bg text-muted border border-border'}`}>
                        {prod.stock}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(prod)}
                        title={prod.active === false ? 'Activar producto' : 'Desactivar producto'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          prod.active !== false ? 'bg-brand' : 'bg-cobrar-border'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          prod.active !== false ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(prod)} className="p-2 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CSV IMPORT MODAL ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-text">Importar Productos desde CSV</h3>
                <p className="text-xs text-muted mt-1">Sube un archivo CSV para importar productos masivamente. Puedes actualizar productos existentes o crear nuevos.</p>
              </div>
              <button 
                onClick={() => { setShowImportModal(false); setSelectedFile(null); }}
                className="text-muted hover:text-text p-1 rounded-lg hover:bg-bg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleImportCSV} className="p-5 space-y-5">
              {/* Template download card */}
              <div className="bg-surface-2 border border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-text">¿Necesitas una plantilla?</h4>
                  <p className="text-xs text-muted mt-0.5">Descarga un archivo CSV de ejemplo con el formato correcto</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-surface hover:bg-bg border border-border text-text text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Download size={14} />
                  Descargar Plantilla
                </button>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-bold text-text mb-2">Archivo CSV</label>
                <div className="bg-surface-2 border border-border rounded-xl p-4 flex flex-col items-center justify-center border-dashed hover:border-brand/30 transition-colors relative">
                  <input
                    type="file"
                    accept=".csv"
                    required
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="text-dim mb-2" size={24} />
                  <span className="text-sm text-text font-medium">
                    {selectedFile ? selectedFile.name : 'Haz clic o arrastra tu archivo aquí'}
                  </span>
                  <span className="text-xs text-muted mt-1">Solo archivos .csv</span>
                </div>
              </div>

              {/* Expected Format Alert */}
              <div className="bg-surface-2 border border-border p-4 rounded-xl text-xs text-muted space-y-1.5 max-h-48 overflow-y-auto">
                <strong className="text-text block text-sm mb-1">Formato esperado:</strong>
                <p>El archivo debe contener las columnas: <span className="text-text font-semibold">Código, Nombre (requerido), Tipo (simple/combo), Categoría, Proveedor, Precio Costo, Precio Neto, Precio Bruto, IVA, Unidad, Imagen, Vencimiento, Stock Actual, Alerta Stock, Activo (SI/NO), Variantes y Componentes</span>.</p>
                <p>Las variantes se cargan como <span className="text-text">Nombre | Código | Stock</span> separadas por punto y coma.</p>
                <p>Los componentes se cargan como <span className="text-text">Producto | Variante | Cantidad</span> (usando código o nombre), separados por punto y coma.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setSelectedFile(null); }}
                  className="bg-transparent hover:bg-bg border border-border text-text text-sm font-bold py-2.5 px-5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importing || !selectedFile}
                  className="bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-text text-sm font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(82,82,255,0.15)]"
                >
                  {importing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Importar Productos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PRODUCT MODAL ── */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface">
              <h3 className="text-lg font-bold text-text">Editar Producto</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-muted hover:text-text p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="flex gap-4">
                <div className="w-16 shrink-0 flex flex-col gap-2">
                  <label className="block text-xs font-bold text-muted mb-0 text-center" title="Pega un Emoji o una URL de imagen">Imagen</label>
                  <div className="relative group w-16 h-16 bg-surface-2 border border-dashed border-border hover:border-brand/50 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-colors">
                    {isUploading ? (
                      <Loader2 size={20} className="text-brand animate-spin" />
                    ) : editingProduct.icon?.startsWith('http') ? (
                      <>
                        <img src={editingProduct.icon} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                           <Upload size={16} className="text-text" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center mt-1">
                        <span className="text-2xl mb-1 leading-none">{editingProduct.icon || '📦'}</span>
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
                    value={editingProduct.icon?.startsWith('http') ? '' : (editingProduct.icon || '')}
                    onChange={(e) => setEditingProduct({...editingProduct, icon: e.target.value})}
                    placeholder="o Emoji"
                    maxLength={2}
                    className="w-16 bg-surface-2 border border-border rounded-lg py-1 px-1 text-center text-[10px] text-text focus:outline-none focus:border-brand"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-muted mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    required
                    className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm text-text focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Precio ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                    required
                    className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm text-text focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted mb-1">Stock Actual</label>
                  <input
                    type="number"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                    required
                    className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm text-text focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-1">Proveedor</label>
                <select
                  value={editingProduct.provider_id || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, provider_id: e.target.value})}
                  className="w-full bg-surface-2 border border-border rounded-lg p-2.5 text-sm text-text focus:outline-none focus:border-brand appearance-none"
                >
                  <option value="">-- Sin proveedor --</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-transparent hover:bg-bg border border-transparent hover:border-border text-text text-sm py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-text font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(82,82,255,0.15)]"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Edit2 size={16} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

