import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, BarChart, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Resumen');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesList, setSalesList] = useState([]);
  const [cashMovements, setCashMovements] = useState([]);
  const [metrics, setMetrics] = useState({
    ingresos: 0,
    ganancia: 0,
    ventas: 0,
    ticket: 0,
    cajaActual: 0
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch all sales for the current user
      let salesQuery = supabase
        .from('sales')
        .select('*')
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
      const gananciaEstimada = ingresosTotales * 0.30;

      setMetrics({
        ingresos: ingresosTotales,
        ganancia: gananciaEstimada,
        ventas: cantidadVentas,
        ticket: ticketPromedio,
        cajaActual: cajaActual
      });

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
    <div className="flex flex-col h-full bg-cobrar-bg overflow-y-auto p-8 custom-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-head font-bold text-white">Reportes</h1>
          <p className="text-sm text-cobrar-txt2">Analiza el rendimiento de tu negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-cobrar-bg2 border border-cobrar-border rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-white">
            <span>Fecha desde:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-cobrar-txt2 custom-date-input" 
            />
          </div>
          <div className="bg-cobrar-bg2 border border-cobrar-border rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-white">
            <span>Fecha hasta:</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-cobrar-txt2 custom-date-input" 
            />
          </div>
          <button 
            onClick={fetchMetrics}
            className="bg-[#5252ff] hover:bg-[#6666ff] px-4 py-2 rounded-xl text-sm font-bold transition-colors text-white shadow-[0_4px_15px_rgba(82,82,255,0.2)]"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-[#1A1A32] border border-[#2A2A4A] rounded-2xl p-6 relative overflow-hidden group">
          <div className="w-10 h-10 bg-[#5252ff]/20 text-[#5252ff] rounded-lg flex items-center justify-center mb-4">
            <DollarSign size={20} />
          </div>
          <p className="text-xs text-cobrar-txt2 font-medium mb-1">Ingresos del periodo</p>
          <h3 className="text-3xl font-bold text-white">
            {loading ? <Loader2 className="animate-spin text-cobrar-txt3" size={24} /> : `$${metrics.ingresos.toLocaleString('es-AR')}`}
          </h3>
        </div>
        <div className="bg-[#1A1A32] border border-[#2A2A4A] rounded-2xl p-6">
          <div className="w-10 h-10 bg-cobrar-green/20 text-cobrar-green rounded-lg flex items-center justify-center mb-4">
            <TrendingUp size={20} />
          </div>
          <p className="text-xs text-cobrar-txt2 font-medium mb-1">Ganancia estimada (30%)</p>
          <h3 className="text-3xl font-bold text-white">
            {loading ? <Loader2 className="animate-spin text-cobrar-txt3" size={24} /> : `$${metrics.ganancia.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          </h3>
        </div>
        <div className="bg-[#1A1A32] border border-[#2A2A4A] rounded-2xl p-6">
          <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center mb-4">
            <BarChart size={20} />
          </div>
          <p className="text-xs text-cobrar-txt2 font-medium mb-1">Total de Ventas</p>
          <h3 className="text-3xl font-bold text-white">
            {loading ? <Loader2 className="animate-spin text-cobrar-txt3" size={24} /> : metrics.ventas}
          </h3>
        </div>
        <div className="bg-[#1A1A32] border border-[#2A2A4A] rounded-2xl p-6">
          <div className="w-10 h-10 bg-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center mb-4">
            <FileText size={20} />
          </div>
          <p className="text-xs text-cobrar-txt2 font-medium mb-1">Ticket Promedio</p>
          <h3 className="text-3xl font-bold text-white">
            {loading ? <Loader2 className="animate-spin text-cobrar-txt3" size={24} /> : `$${metrics.ticket.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          </h3>
        </div>
      </div>

      {/* Tabs Placeholder */}
      <div className="flex gap-8 border-b border-cobrar-border mb-6">
        <button 
          onClick={() => setActiveTab('Resumen')}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'Resumen' ? 'border-[#5252ff] text-white' : 'border-transparent text-cobrar-txt2 hover:text-white'}`}
        >
          Resumen
        </button>
        <button 
          onClick={() => setActiveTab('Ventas')}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'Ventas' ? 'border-[#5252ff] text-white' : 'border-transparent text-cobrar-txt2 hover:text-white'}`}
        >
          Ventas
        </button>
        <button 
          onClick={() => setActiveTab('Caja')}
          className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'Caja' ? 'border-[#5252ff] text-white' : 'border-transparent text-cobrar-txt2 hover:text-white'}`}
        >
          Movimientos de Caja
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'Resumen' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl p-6 h-64 flex flex-col items-center justify-center">
            <p className="text-sm text-white font-bold mb-1">Ingresos y ganancia por día</p>
            <p className="text-xs text-cobrar-txt3 mt-2">Sin datos suficientes en el periodo</p>
          </div>
          <div className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl p-6 h-64 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-white font-bold">Estado de Caja</p>
              <span className="text-xl font-bold text-cobrar-green">${metrics.cajaActual.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <tbody>
                  {cashMovements.slice(0, 5).map(m => (
                    <tr key={m.id} className="border-b border-cobrar-border/30 last:border-0">
                      <td className="py-2 text-cobrar-txt2">{new Date(m.fecha).toLocaleDateString()}</td>
                      <td className="py-2 capitalize">{m.tipo}</td>
                      <td className={`py-2 text-right font-bold ${m.tipo === 'ingreso' ? 'text-cobrar-green' : m.tipo === 'retiro' ? 'text-red-400' : 'text-cobrar-txt2'}`}>
                        {m.tipo === 'ingreso' ? '+' : m.tipo === 'retiro' ? '-' : ''}${Number(m.monto).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {cashMovements.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-cobrar-txt3">Sin movimientos recientes</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Ventas' && (
        <div className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-cobrar-bg2">
              <tr>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Fecha</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesList.map(sale => (
                <tr key={sale.id} className="border-b border-cobrar-border/50 hover:bg-cobrar-bg2 transition-colors">
                  <td className="px-4 py-4 text-white">{new Date(sale.created_at).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-4 font-bold text-cobrar-green">${Number(sale.total).toLocaleString('es-AR')}</td>
                </tr>
              ))}
              {salesList.length === 0 && (
                <tr>
                  <td colSpan="2" className="p-12 text-center text-cobrar-txt3 text-sm">No hay ventas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Caja' && (
        <div className="bg-cobrar-bg3 border border-cobrar-border rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-cobrar-bg2">
              <tr>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Fecha</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Tipo</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Motivo</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-right">Monto</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              {cashMovements.map(m => (
                <tr key={m.id} className="border-b border-cobrar-border/50 hover:bg-cobrar-bg2 transition-colors">
                  <td className="px-4 py-4 text-white">{new Date(m.fecha).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold capitalize ${
                      m.tipo === 'ingreso' ? 'bg-cobrar-green/20 text-cobrar-green' : 
                      m.tipo === 'retiro' ? 'bg-red-400/20 text-red-400' : 'bg-[#5252ff]/20 text-[#5252ff]'
                    }`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-cobrar-txt2">{m.motivo || '-'}</td>
                  <td className={`px-4 py-4 text-right font-bold ${
                    m.tipo === 'ingreso' ? 'text-cobrar-green' : 
                    m.tipo === 'retiro' ? 'text-red-400' : 'text-white'
                  }`}>
                    {m.tipo === 'ingreso' ? '+' : m.tipo === 'retiro' ? '-' : ''}${Number(m.monto).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-white">${Number(m.saldo_nuevo).toLocaleString('es-AR')}</td>
                </tr>
              ))}
              {cashMovements.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-cobrar-txt3 text-sm">No hay movimientos de caja registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
