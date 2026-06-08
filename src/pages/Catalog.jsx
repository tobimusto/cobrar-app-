import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Plus, Minus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Catalog.css';

/* ── helpers ── */
const fmt = (n) => '$' + Number(n).toLocaleString('es-AR');

/* ── category row with horizontal scroll ── */
function CategoryRow({ title, count, products, cart, onAdd, onRemove }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });

  return (
    <section className="cat-section">
      <div className="cat-section-head">
        <h2 className="cat-section-title">{title} <span className="cat-section-count">{count}</span></h2>
        <button className="cat-section-link">Ver todo →</button>
      </div>
      <div className="cat-row-wrap">
        <div className="cat-row" ref={ref}>
          {products.map(p => {
            const inCart = cart.find(c => c.id === p.id);
            return (
              <div key={p.id} className="cat-card">
                <div className="cat-card-img">{p.icon || '📦'}</div>
                <button className="cat-card-add" onClick={() => onAdd(p)} aria-label="Agregar">
                  {inCart ? <span className="cat-card-badge">{inCart.qty}</span> : <Plus size={18} />}
                </button>
                <h3 className="cat-card-name">{p.name}</h3>
                <p className="cat-card-price">{fmt(p.price)}</p>
              </div>
            );
          })}
        </div>
        <div className="cat-row-arrows">
          <button onClick={() => scroll(-1)} className="cat-arrow"><ChevronLeft size={18}/></button>
          <button onClick={() => scroll(1)} className="cat-arrow"><ChevronRight size={18}/></button>
        </div>
      </div>
    </section>
  );
}

/* ── whatsapp preview bubble ── */
function WaPreview({ storeName, cart }) {
  const now = new Date();
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  let msg = `Hola ${storeName}, quisiera realizar el siguiente pedido:\n`;
  cart.forEach(i => { msg += `• ${i.name} x${i.qty} · ${fmt(i.price * i.qty)}\n`; });
  const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
  msg += `Subtotal: ${fmt(total)}\nTotal: ${fmt(total)}`;

  return (
    <div className="wa-preview">
      <div className="wa-preview-head">
        <div className="wa-preview-av">C</div>
        <div><strong>{storeName}</strong><span>en línea</span></div>
      </div>
      <div className="wa-preview-body">
        <div className="wa-bubble">{msg.split('\n').map((l,i) => <span key={i}>{l}<br/></span>)}</div>
        <span className="wa-time">{time} ✓✓</span>
      </div>
    </div>
  );
}

/* ══════════ MAIN CATALOG ══════════ */
export default function Catalog() {
  const { slugOrId } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showWaPreview, setShowWaPreview] = useState(true);

  useEffect(() => { fetchData(); }, [slugOrId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('store_settings').select('*');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
      
      if (isUuid) {
        query = query.eq('id', slugOrId);
      } else {
        query = query.eq('slug', slugOrId);
      }
      
      const { data: s } = await query.single();
      if (s) setStore(s);
      
      // We should ideally filter products by user_id of the store, but for now we keep the current logic
      const { data: p } = await supabase.from('products').select('*').gt('stock', 0).order('name');
      if (p) setProducts(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* derive categories from icon */
  const iconToCategory = (icon) => {
    const map = { '🥤':'Bebidas','💧':'Bebidas','🍺':'Bebidas','⚡':'Bebidas','🍫':'Golosinas','🥔':'Snacks' };
    return map[icon] || 'Otros';
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const categories = ['Todos', ...new Set(products.map(p => iconToCategory(p.icon)))];
  const displayProducts = activeTab === 'Todos' ? filtered : filtered.filter(p => iconToCategory(p.icon) === activeTab);

  /* group by category for sections */
  const grouped = {};
  filtered.forEach(p => {
    const cat = iconToCategory(p.icon);
    (grouped[cat] = grouped[cat] || []).push(p);
  });

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) { if (ex.qty >= product.stock) return prev; return prev.map(i => i.id === product.id ? {...i, qty: i.qty+1} : i); }
      return [...prev, { ...product, qty: 1 }];
    });
  };
  const removeFromCart = (id) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === id);
      if (ex && ex.qty > 1) return prev.map(i => i.id === id ? {...i, qty: i.qty-1} : i);
      return prev.filter(i => i.id !== id);
    });
  };

  const cartTotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s,i) => s + i.qty, 0);

  const checkout = () => {
    if (!store?.whatsapp_number) return;
    let msg = `Hola ${store.store_name}, quisiera realizar el siguiente pedido:\n`;
    cart.forEach(i => { msg += `• ${i.name} *x${i.qty}* · ${fmt(i.price*i.qty)}\n`; });
    msg += `Subtotal: ${fmt(cartTotal)}\n*Total: ${fmt(cartTotal)}*`;
    window.open(`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* ── loading ── */
  if (loading) return (
    <div className="cat-loading"><div className="cat-spinner"></div></div>
  );

  /* ── not found ── */
  if (!store) return (
    <div className="cat-notfound">
      <div className="cat-notfound-icon">🏪</div>
      <h1>Tienda no encontrada</h1>
      <p>Revisá que el enlace sea correcto.</p>
    </div>
  );

  return (
    <div className="cat-page">
      {/* ── HEADER ── */}
      {store.banner_url && (
        <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
          <img src={store.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <header className="cat-header" style={{ marginTop: store.banner_url ? '-20px' : '0', borderRadius: store.banner_url ? '20px 20px 0 0' : '0' }}>
        <div className="cat-header-brand">
          {store.logo_url ? (
            <img src={store.logo_url} alt="Logo" className="cat-logo" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="cat-logo">{store.store_name?.charAt(0)?.toUpperCase() || 'C'}</div>
          )}
          <div className="cat-header-info">
            <h1 className="cat-store-name">{store.store_name} <svg className="cat-verified" viewBox="0 0 24 24" width="18" height="18"><path fill="#3b82f6" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></h1>
            {store.description ? (
              <p className="cat-store-meta" style={{ fontSize: '0.8rem', lineHeight: '1.2', color: '#666', marginTop: '4px', whiteSpace: 'normal' }}>{store.description}</p>
            ) : (
              <p className="cat-store-meta">Abierto ahora · Pedidos por WhatsApp</p>
            )}
          </div>
          {cartCount > 0 && (
            <button className="cat-header-cart" onClick={() => setCartOpen(true)}>
              🛒 <span className="cat-header-cart-badge">{cartCount}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── SEARCH ── */}
      <div className="cat-search-wrap">
        <Search className="cat-search-icon" size={18} />
        <input className="cat-search" placeholder={`Buscar en ${store.store_name}`} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* ── TABS ── */}
      <div className="cat-tabs">
        {categories.map(c => (
          <button key={c} className={`cat-tab ${activeTab===c?'active':''}`} onClick={() => setActiveTab(c)}>{c}</button>
        ))}
      </div>

      {/* ── PROMOS ── */}
      {store.promotions && Array.isArray(store.promotions) && store.promotions.length > 0 && (
        <div className="cat-promos">
          {store.promotions.map((promo, idx) => (
            <div key={idx} className="cat-promo">
              <span className="cat-promo-icon">{promo.icon || '🔥'}</span>
              <div>
                <strong>{promo.title}</strong>
                <span>{promo.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PRODUCT SECTIONS ── */}
      <main className="cat-main">
        {activeTab === 'Todos' ? (
          Object.entries(grouped).map(([cat, prods]) => (
            <CategoryRow key={cat} title={cat} count={prods.length} products={prods} cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
          ))
        ) : (
          <div className="cat-grid">
            {displayProducts.map(p => {
              const inCart = cart.find(c => c.id === p.id);
              return (
                <div key={p.id} className="cat-card">
                  <div className="cat-card-img">{p.icon || '📦'}</div>
                  <button className="cat-card-add" onClick={() => addToCart(p)}>{inCart ? <span className="cat-card-badge">{inCart.qty}</span> : <Plus size={18}/>}</button>
                  <h3 className="cat-card-name">{p.name}</h3>
                  <p className="cat-card-price">{fmt(p.price)}</p>
                </div>
              );
            })}
          </div>
        )}
        {displayProducts.length === 0 && <p className="cat-empty">No se encontraron productos.</p>}
      </main>

      {/* ── FLOATING CART BUTTON ── */}
      {cartCount > 0 && !cartOpen && (
        <div className="cat-fab-wrap">
          <button className="cat-fab" onClick={() => setCartOpen(true)}>
            <span className="cat-fab-count">{cartCount}</span>
            <span>Ver pedido</span>
            <span className="cat-fab-total">{fmt(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div className="cat-drawer-overlay" onClick={() => setCartOpen(false)}>
          <div className="cat-drawer" onClick={e => e.stopPropagation()}>
            <div className="cat-drawer-handle"></div>

            <div className="cat-drawer-head">
              <div>
                <h2>Tu pedido</h2>
                <span className="cat-drawer-count">{cartCount} producto{cartCount!==1?'s':''}</span>
              </div>
              <button className="cat-drawer-close" onClick={() => setCartOpen(false)}><X size={22}/></button>
            </div>

            <div className="cat-drawer-items">
              {cart.map(item => (
                <div key={item.id} className="cat-drawer-item">
                  <div className="cat-drawer-item-icon">{item.icon || '📦'}</div>
                  <div className="cat-drawer-item-info">
                    <span className="cat-drawer-item-name">{item.name}</span>
                  </div>
                  <div className="cat-drawer-qty">
                    <button onClick={() => removeFromCart(item.id)} className="cat-qty-btn"><Minus size={14}/></button>
                    <span>{item.qty}</span>
                    <button onClick={() => addToCart(item)} className="cat-qty-btn"><Plus size={14}/></button>
                  </div>
                  <span className="cat-drawer-item-price">{fmt(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            {/* wa preview toggle */}
            <button className="cat-wa-toggle" onClick={() => setShowWaPreview(v => !v)}>
              {showWaPreview ? 'Ocultar' : 'Mostrar'} mensaje de WhatsApp
            </button>

            {showWaPreview && <WaPreview storeName={store.store_name} cart={cart} />}

            <div className="cat-drawer-footer">
              <div className="cat-drawer-totals">
                <div className="cat-drawer-total-row"><span>Subtotal</span><span>{fmt(cartTotal)}</span></div>
                <div className="cat-drawer-total-row total"><span>Total</span><span>{fmt(cartTotal)}</span></div>
              </div>
              <button className="cat-wa-btn" onClick={checkout} disabled={cart.length===0}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar pedido por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
