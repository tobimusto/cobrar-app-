import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code && p.code.includes(searchTerm))
  );

  return (
    <div className="flex flex-col h-full p-8 overflow-hidden">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="font-head font-bold text-2xl text-white">Inventario</h2>
          <p className="text-cobrar-txt2 text-sm mt-1">Gestiona tus productos y controla el stock</p>
        </div>
        <button 
          onClick={() => window.location.href = '/inventory/new'}
          className="bg-cobrar-green text-black font-bold py-2.5 px-5 rounded-xl hover:bg-[#05FF88] transition-all text-sm flex items-center gap-2"
        >
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>
      
      <div className="flex-1 bg-cobrar-bg3 border border-cobrar-border rounded-2xl flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-cobrar-border bg-cobrar-bg2 flex justify-between items-center shrink-0">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cobrar-green/50 transition-colors"
            />
          </div>
          <div className="text-sm text-cobrar-txt2">
            <span className="font-bold text-white">{filteredProducts.length}</span> productos
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-cobrar-bg2 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Icono</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Producto</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Código</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-right">Precio</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-center">Stock</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cobrar-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-cobrar-green">
                    <Loader2 className="animate-spin mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-cobrar-txt3">
                    <Package size={32} className="mx-auto mb-3 opacity-50" />
                    No hay productos para mostrar
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-cobrar-bg2/50 transition-colors group">
                    <td className="p-4">
                      <div className="w-10 h-10 bg-cobrar-bg rounded-lg border border-cobrar-border flex items-center justify-center text-xl">
                        {prod.icon || '📦'}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-white">{prod.name}</td>
                    <td className="p-4 text-cobrar-txt2 text-sm">{prod.code || '-'}</td>
                    <td className="p-4 text-right font-bold text-cobrar-green">${prod.price.toLocaleString('es-AR')}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${prod.stock < 10 ? 'bg-cobrar-orange/20 text-cobrar-orange' : 'bg-cobrar-bg text-cobrar-txt2 border border-cobrar-border'}`}>
                        {prod.stock}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-cobrar-txt2 hover:text-white hover:bg-cobrar-bg rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-cobrar-txt2 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
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
    </div>
  );
}
