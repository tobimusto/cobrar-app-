import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, BarChart as BarChartIcon, FileText, Loader2, Trash2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Resumen');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesList, setSalesList] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [storeMargin, setStoreMargin] = useState(30);
  const [metrics, setMetrics] = useState({
    ingresos: 0,
    ganancia: 0,
    ventas: 0,
    ticket: 0,
    cajaActual: 0
  });
  const [chartData, setChartData] = useState([]);
  const [deletingSale, setDeletingSale] = useState(null); // sale to confirm deletion
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSale = async (sale) => {
    setDeleting(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('cancel_sale', {
        p_sale_id: sale.id,
        p_user_id: user.id,
        p_employee_id: user.id
      });

      if (rpcError) throw rpcError;

      fetchMetrics(); // Refresh everything
      toast.success('Venta anulada y stock restaurado.');
    } catch (err) {
      console.error('Error deleting sale:', err);
      toast.error('Error al anular la venta.');
    } finally {
      setDeleting(false);
      setDeletingSale(null);
    }
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      
      // Fetch all sales for the current user
      let salesQuery = supabase
        .from('sales')
        .select('*, sale_items(qty, price, product_id, products(name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (startDate) salesQuery = salesQuery.gte('created_at', `${startDate}T00:00:00`);
      if (endDate) salesQuery = salesQuery.lte('created_at', `${endDate}T23:59:59`);

      const { data: sales, error: salesError } = await salesQuery;

      if (salesError) throw salesError;
      setSalesList(sales || []);

      // Fetch cash movements
      let cashQuery = supabase
        .from('cash_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false });

      if (startDate) cashQuery = cashQuery.gte('fecha', `${startDate}T00:00:00`);
      if (endDate) cashQuery = cashQuery.lte('fecha', `${endDate}T23:59:59`);

      const { data: cash, error: cashError } = await cashQuery;

      if (cashError) throw cashError;
      setCashMovements(cash || []);

      // Fetch store margin
      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('estimated_margin')
        .eq('user_id', user.id)
        .single();
      
      const marginPercentage = settingsData?.estimated_margin || 30;
      const marginDecimal = marginPercentage / 100;
      setStoreMargin(marginPercentage);

      let ingresosTotales = 0;
      let cantidadVentas = 0;
      let cajaActual = 0;

      if (sales && sales.length > 0) {
        ingresosTotales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
        cantidadVentas = sales.length;
      }

      if (cash && cash.length > 0) {
        cajaActual = Number(cash[0].saldo_nuevo);
      }

      const ticketPromedio = cantidadVentas > 0 ? ingresosTotales / cantidadVentas : 0;
      const gananciaEstimada = ingresosTotales * marginDecimal;

      setMetrics({
        ingresos: ingresosTotales,
        ganancia: gananciaEstimada,
        ventas: cantidadVentas,
        ticket: ticketPromedio,
        cajaActual: cajaActual
      });

      // Agrupar ventas por día para el gráfico
      const dailyData = {};
      (sales || []).forEach(sale => {
        const date = new Date(sale.created_at);
        // Ajuste zona horaria (mostrar día local)
        const dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        if (!dailyData[dateString]) {
          dailyData[dateString] = { fecha: dateString, ingresos: 0, ganancia: 0 };
        }
        const amount = Number(sale.total);
        dailyData[dateString].ingresos += amount;
        dailyData[dateString].ganancia += amount * marginDecimal;
      });

      // Convertir a array, ordenar por fecha de más antiguo a más nuevo
      const sortedChartData = Object.values(dailyData).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(item => ({
        ...item,
        fecha: new Date(item.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
      }));

      setChartData(sortedChartData);

    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  return (
    <div className="flex flex-col h-full bg-bg overflow-y-auto p-4 md:p-8 custom-scrollbar">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-text">Reportes</h1>
          <p className="text-sm text-muted">Analiza el rendimiento de tu negocio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-auto bg-surface border border-border rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-text">
            <span>Fecha desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-muted custom-date-input"
            />
          </div>
          <div className="w-full sm:w-auto bg-surface border border-border rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-text">
            <span>Fecha hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-muted custom-date-input"
            />
          </div>
          <button
            onClick={fetchMetrics}
            className="w-full sm:w-auto bg-brand hover:bg-brand-hover px-4 py-2 rounded-xl text-sm font-bold transition-colors text-text shadow-[0_4px_15px_rgba(82,82,255,0.2)]"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div className="bg-surface-2 border border-border rounded-2xl p-6 relative overflow-hidden group">
          <div className="w-10 h-10 bg-brand/20 text-brand rounded-lg flex items-center justify-center mb-4">
            <DollarSign size={20} />
          </div>
          <p className="text-xs text-muted font-medium mb-1">Ingresos del periodo</p>
          <h3 className="text-3xl font-bold text-text">
            {loading ? <Loader2 className="animate-spin text-dim" size={24} /> : `$${metrics.ingresos.toLocaleString('es-AR')}`}
          </h3>
        </div>
        <div className="bg-surface-2 border border-border rounded-2xl p-6">
          <div className="w-10 h-10 bg-brand/20 text-brand rounded-lg flex items-center justify-center mb-4">
            <TrendingUp size={20} />
          </div>
          <p className="text-xs text-muted font-medium mb-1">Ganancia estimada ({storeMargin}%)</p>
          <h3 className="text-3xl font-bold text-text">
            {loading ? <Loader2 className="animate-spin text-dim" size={24} /> : `$${metrics.ganancia.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          </h3>
        </div>
        <div className="bg-surface-2 border border-border rounded-2xl p-6">
          <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center mb-4">
            <BarChartIcon size={20} />
          </div>
          <p className="text-xs text-muted font-medium mb-1">Total de Ventas</p>
          <h3 className="text-3xl font-bold text-text">
            {loading ? <Loader2 className="animate-spin text-dim" size={24} /> : metrics.ventas}
          </h3>
        </div>
        <div className="bg-surface-2 border border-border rounded-2xl p-6">
          <div className="w-10 h-10 bg-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center mb-4">
            <FileText size={20} />
          </div>
          <p className="text-xs text-muted font-medium mb-1">Ticket Promedio</p>
          <h3 className="text-3xl font-bold text-text">
            {loading ? <Loader2 className="animate-spin text-dim" size={24} /> : `$${metrics.ticket.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          </h3>
        </div>
      </div>

      {/* Tabs Placeholder */}
      <div className="flex flex-wrap gap-4 sm:gap-8 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('Resumen')}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'Resumen' ? 'border-brand text-text' : 'border-transparent text-muted hover:text-text'}`}
        >
          Resumen
        </button>
        <button 
          onClick={() => setActiveTab('Ventas')}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'Ventas' ? 'border-brand text-text' : 'border-transparent text-muted hover:text-text'}`}
        >
          Ventas
        </button>
        <button 
          onClick={() => setActiveTab('Caja')}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'Caja' ? 'border-brand text-text' : 'border-transparent text-muted hover:text-text'}`}
        >
          Movimientos de Caja
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'Resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-surface-2 border border-border rounded-2xl p-6 h-64 flex flex-col">
            <p className="text-sm text-text font-bold mb-4">Ingresos y ganancia por día</p>
            {chartData.length > 0 ? (
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="fecha" stroke="#8a8a98" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#2A2A4A', opacity: 0.4}}
                      contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value) => `$${Number(value).toLocaleString('es-AR', {maximumFractionDigits: 0})}`}
                    />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#5252ff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ganancia" name="Ganancia" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-dim">Sin datos suficientes en el periodo</p>
              </div>
            )}
          </div>
          <div className="bg-surface-2 border border-border rounded-2xl p-6 h-64 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-text font-bold">Estado de Caja</p>
              <span className="text-xl font-bold text-brand">${metrics.cajaActual.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <tbody>
                  {cashMovements.slice(0, 5).map(m => (
                    <tr key={m.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2 text-muted">{new Date(m.fecha).toLocaleDateString()}</td>
                      <td className="py-2 capitalize">{m.tipo}</td>
                      <td className={`py-2 text-right font-bold ${m.tipo === 'ingreso' ? 'text-brand' : m.tipo === 'retiro' ? 'text-red-400' : 'text-muted'}`}>
                        {m.tipo === 'ingreso' ? '+' : m.tipo === 'retiro' ? '-' : ''}${Number(m.monto).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {cashMovements.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-dim">Sin movimientos recientes</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Ventas' && (
        <div className="bg-surface-2 border border-border rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead className="bg-surface">
              <tr>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Fecha</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Detalle</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Subtotal / Ajuste</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Pago</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Total</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {salesList.slice(0, 100).map(sale => {
                let subtotal = 0;
                let itemsList = [];
                if (sale.sale_items && sale.sale_items.length > 0) {
                  sale.sale_items.forEach(item => {
                    subtotal += (Number(item.price) * Number(item.qty));
                    const prodName = item.products?.name || 'Producto eliminado/Varios';
                    itemsList.push(`${item.qty}x ${prodName}`);
                  });
                } else {
                  subtotal = Number(sale.total);
                  itemsList.push('Venta general');
                }

                const total = Number(sale.total);
                const difference = subtotal - total;
                // If subtotal is greater than total, there is a discount
                const isDiscount = difference > 0.01;
                const isSurcharge = difference < -0.01;

                return (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                    <td className="px-4 py-4 text-text align-top whitespace-nowrap">{new Date(sale.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1 max-w-[250px]">
                        {itemsList.map((itemStr, i) => (
                          <span key={i} className="text-sm text-muted truncate" title={itemStr}>{itemStr}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-text text-sm">${subtotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                        {(isDiscount || isSurcharge) && (
                          <span className={`text-xs font-medium mt-0.5 ${isDiscount ? 'text-brand' : 'text-red-400'}`}>
                            {isDiscount ? '-' : '+'}${Math.abs(difference).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold capitalize ${
                        sale.payment_method === 'Efectivo' || sale.payment_method === 'efectivo' ? 'bg-emerald-500/20 text-emerald-400' :
                        sale.payment_method === 'Transferencia' || sale.payment_method === 'transferencia' ? 'bg-brand/20 text-brand' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {sale.payment_method || 'Varios'}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-brand text-right align-top whitespace-nowrap">
                      ${total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-center align-top">
                      <button
                        onClick={() => setDeletingSale(sale)}
                        className="p-2 text-dim hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Anular venta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {salesList.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-dim text-sm">No hay ventas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Caja' && (
        <div className="bg-surface-2 border border-border rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead className="bg-surface">
              <tr>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Fecha</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Tipo</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border">Motivo</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Monto</th>
                <th className="p-4 font-display font-semibold text-xs tracking-wider text-muted uppercase border-b border-border text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              {cashMovements.slice(0, 100).map(m => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-surface transition-colors">
                  <td className="px-4 py-4 text-text">{new Date(m.fecha).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold capitalize ${
                      m.tipo === 'ingreso' ? 'bg-brand/20 text-brand' : 
                      m.tipo === 'retiro' ? 'bg-red-400/20 text-red-400' : 'bg-brand/20 text-brand'
                    }`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted">{m.motivo || '-'}</td>
                  <td className={`px-4 py-4 text-right font-bold ${
                    m.tipo === 'ingreso' ? 'text-brand' : 
                    m.tipo === 'retiro' ? 'text-red-400' : 'text-text'
                  }`}>
                    {m.tipo === 'ingreso' ? '+' : m.tipo === 'retiro' ? '-' : ''}${Number(m.monto).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-text">${Number(m.saldo_nuevo).toLocaleString('es-AR')}</td>
                </tr>
              ))}
              {cashMovements.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-dim text-sm">No hay movimientos de caja registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deletingSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text">¿Anular esta venta?</h3>
                  <p className="text-sm text-muted">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <div className="bg-bg border border-border rounded-xl p-4 mb-6 text-sm space-y-2">
                <p className="text-muted">Fecha: <span className="text-text">{new Date(deletingSale.created_at).toLocaleString('es-AR')}</span></p>
                <p className="text-muted">Total: <span className="font-bold text-red-400">${Number(deletingSale.total).toLocaleString('es-AR')}</span></p>
                {deletingSale.payment_method === 'efectivo' && <p className="text-xs text-red-300">⚠️ Se descontará el monto del saldo de caja (efectivo).</p>}
                {deletingSale.sale_items?.length > 0 && <p className="text-xs text-brand">✓ Se repondrá el stock de {deletingSale.sale_items.length} producto(s).</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeletingSale(null)} disabled={deleting} className="flex-1 bg-transparent border border-border text-text font-medium py-3 rounded-xl transition-all hover:bg-bg">
                  Cancelar
                </button>
                <button onClick={() => handleDeleteSale(deletingSale)} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-text font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {deleting ? 'Anulando...' : 'Anular Venta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
