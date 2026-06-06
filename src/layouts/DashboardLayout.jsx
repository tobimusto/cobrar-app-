import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  MonitorSmartphone, ShoppingBag, 
  Package, ArrowLeftRight, 
  Users, UserCog, 
  BarChart3, 
  Settings, HelpCircle,
  LogOut, Wallet, ChevronDown, ChevronUp, Check, X, ArrowUpCircle, ArrowDownCircle, Calculator
} from 'lucide-react';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [showBusinessMenu, setShowBusinessMenu] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [cashAction, setCashAction] = useState(null); // 'ingresar', 'retirar', 'cerrar', 'abrir'
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchCashStatus();
    }
  }, [user]);

  // Check reminder every minute or when register status changes
  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTime = currentHours + (currentMinutes / 60);

      const openingTimeStr = localStorage.getItem('cobrar_opening_time') || '08:00';
      const closingTimeStr = localStorage.getItem('cobrar_closing_time') || '20:00';

      const [openH, openM] = openingTimeStr.split(':').map(Number);
      const [closeH, closeM] = closingTimeStr.split(':').map(Number);
      
      const openTime = openH + (openM / 60);
      const closeTime = closeH + (closeM / 60);

      if (!isRegisterOpen && currentTime >= openTime && currentTime < closeTime) {
        setReminderMessage(`Es hora de abrir la caja. (Horario configurado: ${openingTimeStr})`);
        setShowReminder(true);
      } else if (isRegisterOpen && currentTime >= closeTime) {
        setReminderMessage(`Recordatorio: ¡No olvides hacer el cierre de caja! (Cierre: ${closingTimeStr})`);
        setShowReminder(true);
      } else {
        setShowReminder(false);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isRegisterOpen]);

  const fetchCashStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastMovement = data[0];
        setCashAmount(Number(lastMovement.saldo_nuevo));
        setIsRegisterOpen(lastMovement.tipo !== 'cierre');
      } else {
        // First time
        setIsRegisterOpen(false);
        setCashAmount(0);
      }
    } catch (err) {
      console.error('Error fetching cash status:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuGroups = [
    {
      title: 'OPERACIÓN',
      items: [
        { name: 'Punto de Venta', path: '/pos', icon: MonitorSmartphone },
        { name: 'Compras', path: '/purchases', icon: ShoppingBag },
      ]
    },
    {
      title: 'CATÁLOGO',
      items: [
        { name: 'Productos', path: '/inventory', icon: Package },
        { name: 'Movimientos', path: '/movements', icon: ArrowLeftRight },
      ]
    },
    {
      title: 'PERSONAS',
      items: [
        { name: 'Clientes', path: '/clients', icon: Users },
        { name: 'Usuarios', path: '/users', icon: UserCog },
      ]
    },
    {
      title: 'ANÁLISIS',
      items: [
        { name: 'Reportes', path: '/reports', icon: BarChart3 },
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { name: 'Configuración', path: '/settings', icon: Settings },
        { name: 'Soporte', path: 'https://wa.me/5491100000000?text=Hola,%20necesito%20soporte%20con%20CobrAR', icon: HelpCircle },
      ]
    }
  ];
  const handleCashSubmit = async () => {
    setErrorMsg('');
    const val = parseFloat(inputValue);
    
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Por favor ingresá un monto mayor a 0.');
      return;
    }

    let newAmount = cashAmount;
    if (cashAction === 'ingresar' || cashAction === 'abrir') {
      newAmount += val;
    } else if (cashAction === 'retirar') {
      if (val > cashAmount) {
        setErrorMsg('No podés retirar más dinero del disponible en caja.');
        return;
      }
      newAmount -= val;
    }

    try {
      const { error } = await supabase.from('cash_movements').insert([{
        user_id: user.id,
        tipo: cashAction === 'abrir' ? 'apertura' : cashAction,
        monto: val,
        motivo: cashAction === 'ingresar' ? 'Ingreso manual' : cashAction === 'retirar' ? 'Retiro manual' : 'Monto inicial en caja',
        saldo_anterior: cashAmount,
        saldo_nuevo: newAmount
      }]);

      if (error) throw error;

      setCashAmount(newAmount);
      if (cashAction === 'abrir') setIsRegisterOpen(true);
      
      setInputValue('');
      setCashAction(null);
      if (cashAction === 'abrir') setShowCashModal(false);
    } catch (err) {
      console.error('Error in cash movement:', err);
      alert('Error al registrar movimiento de caja');
    }
  };

  const handleCloseRegister = async () => {
    try {
      const { error } = await supabase.from('cash_movements').insert([{
        user_id: user.id,
        tipo: 'cierre',
        monto: cashAmount,
        motivo: 'Cierre de turno',
        saldo_anterior: cashAmount,
        saldo_nuevo: 0
      }]);

      if (error) throw error;

      setIsRegisterOpen(false);
      setCashAmount(0);
      setShowCashModal(false);
      setCashAction(null);
    } catch (err) {
      console.error('Error closing register:', err);
      alert('Error al cerrar caja');
    }
  };

  const handleOpenRegister = async () => {
    // Si queremos un botón explícito de abrir caja, lo podemos agregar.
    // Por ahora, asumimos que registrar un ingreso o venta con caja cerrada la abre.
    setIsRegisterOpen(true);
  };

  return (
    <div className="flex h-screen bg-cobrar-bg text-cobrar-txt font-body overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-cobrar-bg2 border-r border-cobrar-border flex flex-col shrink-0 relative z-20">
        
        {/* Business Selector Top */}
        <div className="p-4 relative">
          <button 
            onClick={() => setShowBusinessMenu(!showBusinessMenu)}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left border ${showBusinessMenu ? 'bg-[#5252ff] border-[#5252ff]' : 'bg-[#5252ff]/10 border-[#5252ff]/20 hover:bg-[#5252ff]/20'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${showBusinessMenu ? 'bg-white/20 text-white' : 'bg-[#5252ff] text-white'}`}>
                C
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-sm leading-tight ${showBusinessMenu ? 'text-white' : 'text-white'}`}>CobrAR Pos</span>
                <span className={`text-[10px] leading-tight ${showBusinessMenu ? 'text-white/80' : 'text-cobrar-txt2'}`}>#De91 - Propietario</span>
              </div>
            </div>
            {showBusinessMenu ? <ChevronUp size={16} className="text-white/80" /> : <ChevronDown size={16} className="text-cobrar-txt2" />}
          </button>

          {/* Business Dropdown */}
          {showBusinessMenu && (
            <div className="absolute top-full left-4 right-4 mt-2 bg-cobrar-bg3 border border-cobrar-border rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-3 border-b border-cobrar-border">
                <div className="relative">
                  <MonitorSmartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" />
                  <input 
                    type="text" 
                    placeholder="Buscar negocio..." 
                    className="w-full bg-cobrar-bg border border-cobrar-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-[#5252ff]"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto p-2">
                <button className="w-full flex items-center justify-between p-2 rounded-lg bg-cobrar-bg2 border border-[#5252ff]/30 text-left">
                  <div className="flex items-center gap-3">
                    <Check size={14} className="text-[#5252ff] shrink-0" />
                    <div className="w-8 h-8 rounded-lg bg-[#5252ff] flex items-center justify-center font-bold text-white text-sm shrink-0">
                      C
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white text-sm truncate">CobrAR Pos</span>
                      <span className="text-cobrar-txt2 text-[10px] truncate">#De91 - Propietario</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 overflow-y-auto space-y-6 pb-6 custom-scrollbar">
          {menuGroups.map((group, i) => (
            <div key={i}>
              <h3 className="text-[10px] font-head font-bold tracking-widest text-cobrar-txt3 uppercase mb-2 px-3">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isExternal = item.path.startsWith('http');
                  const isActive = !isExternal && location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  
                  if (isExternal) {
                    return (
                      <a
                        key={item.name}
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-[13px] text-cobrar-txt2 hover:bg-cobrar-bg3 hover:text-white"
                      >
                        <Icon size={16} className="opacity-70" />
                        {item.name}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-[13px] ${
                        isActive 
                          ? 'bg-[#5252ff]/10 text-[#5252ff]' 
                          : 'text-cobrar-txt2 hover:bg-cobrar-bg3 hover:text-white'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-[#5252ff]' : 'opacity-70'} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Widgets */}
        <div className="p-4 border-t border-cobrar-border bg-cobrar-bg3">
          {/* Mi Caja Widget */}
          <div className="bg-cobrar-bg2 border border-cobrar-border p-3 rounded-xl mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wallet size={14} className={isRegisterOpen ? "text-cobrar-green" : "text-cobrar-txt3"} />
                Mi Caja
              </div>
              {isRegisterOpen ? (
                <span className="bg-[#5252ff] text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Abierta</span>
              ) : (
                <span className="bg-cobrar-bg border border-cobrar-border text-cobrar-txt3 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Cerrada</span>
              )}
            </div>
            <div className="text-[11px] text-cobrar-txt2 mb-2 flex items-baseline gap-1">
              Mi efectivo: <span className="font-bold text-white text-sm ml-1">${cashAmount.toFixed(2)}</span>
            </div>
            {isRegisterOpen && (
              <div className="text-[9px] text-cobrar-txt3 mb-3">
                Abierta: 3:56:03 PM
              </div>
            )}
            <button 
              onClick={() => {
                if (!isRegisterOpen) {
                  setCashAction('abrir');
                  setShowCashModal(true);
                  return;
                }
                setShowCashModal(true);
                setCashAction(null);
              }}
              className={`w-full border py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                isRegisterOpen 
                  ? 'bg-cobrar-bg border-cobrar-border hover:bg-[#5252ff]/10 hover:text-[#5252ff] hover:border-[#5252ff]/30' 
                  : 'bg-[#5252ff] border-[#5252ff] text-white hover:bg-[#6666ff]'
              }`}
            >
              {isRegisterOpen ? (
                <><ArrowLeftRight size={12} /> Gestionar Caja</>
              ) : (
                <>Abrir Caja</>
              )}
            </button>
          </div>

          {/* User Profile */}
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-cobrar-bg2 transition-colors group"
          >
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold text-white truncate max-w-[150px]">
                {user?.email?.split('@')[0] || 'Usuario'}
              </span>
              <span className="text-[10px] text-cobrar-txt2 truncate max-w-[150px]">
                {user?.email || 'admin@comercio.com'}
              </span>
            </div>
            <LogOut size={16} className="text-cobrar-txt3 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-cobrar-bg relative overflow-hidden z-10">
        
        {/* Banner de Recordatorio */}
        {showReminder && (
          <div className="bg-[#5252ff]/10 border-b border-[#5252ff]/30 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-[#5252ff] text-sm font-bold">
              <span className="animate-pulse">🔔</span> {reminderMessage}
            </div>
            <button 
              onClick={() => setShowReminder(false)}
              className="text-cobrar-txt3 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ isRegisterOpen, setShowCashModal, setCashAction, cashAmount, setCashAmount }} />
        </div>
      </main>

      {/* Cash Management Modal */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-cobrar-border rounded-2xl w-full max-w-[400px] overflow-hidden shadow-2xl relative">
            
            <button 
              onClick={() => {
                setShowCashModal(false);
                setCashAction(null);
                setInputValue('');
              }}
              className="absolute top-4 right-4 text-cobrar-txt3 hover:text-white transition-colors z-10"
            >
              <X size={18} />
            </button>
            
            <div className="p-6">
              {!cashAction ? (
                <>
                  <h2 className="text-lg font-head font-bold text-white flex items-center gap-2 mb-2">
                    <span className="text-cobrar-txt2">$</span> Gestionar caja
                  </h2>
                  <p className="text-sm text-cobrar-txt2 mb-6 leading-relaxed">
                    Revisa tu efectivo disponible y elegí una acción para continuar.
                  </p>

                  <div className="bg-[#1a1a23] border border-cobrar-border rounded-xl p-5 mb-6 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-cobrar-txt2 font-medium mb-1">Efectivo disponible</p>
                      <p className="text-3xl font-bold text-white">${cashAmount.toFixed(2)}</p>
                    </div>
                    <div className="text-[#3a3a4a]">
                      <span className="text-5xl font-light">$</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => setCashAction('ingresar')}
                      className="w-full bg-[#1a1a23] hover:bg-cobrar-bg3 border border-cobrar-border py-3.5 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowUpCircle size={16} className="text-cobrar-green" /> Ingresar efectivo
                    </button>
                    <button 
                      onClick={() => setCashAction('retirar')}
                      className="w-full bg-[#1a1a23] hover:bg-cobrar-bg3 border border-cobrar-border py-3.5 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowDownCircle size={16} className="text-red-400" /> Retirar efectivo
                    </button>
                    <button 
                      onClick={() => setCashAction('cerrar')}
                      className="w-full bg-[#994747] hover:bg-[#b05252] text-white font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 mt-2 shadow-[0_4px_15px_rgba(153,71,71,0.2)]"
                    >
                      <Calculator size={16} /> Cerrar caja
                    </button>
                  </div>
                </>
              ) : cashAction === 'cerrar' ? (
                <div className="text-center py-4 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 bg-[#994747]/10 border border-[#994747]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calculator size={32} className="text-[#994747]" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">¿Estás seguro?</h2>
                  <p className="text-sm text-cobrar-txt2 mb-6">
                    Se cerrará el turno actual. Deberás ingresar el conteo final de caja y abrirla nuevamente mañana.
                  </p>
                  
                  <div className="bg-[#1a1a23] border border-cobrar-border rounded-xl p-4 mb-6 text-left flex justify-between items-center">
                    <span className="text-sm text-cobrar-txt2">Total a rendir:</span>
                    <span className="text-lg font-bold text-white">${cashAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setCashAction(null)}
                      className="flex-1 bg-transparent hover:bg-cobrar-bg2 border border-cobrar-border text-white font-medium py-3 rounded-xl transition-all text-sm"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleCloseRegister}
                      className="flex-1 bg-[#994747] hover:bg-[#b05252] text-white font-bold py-3 rounded-xl transition-all text-sm shadow-[0_4px_15px_rgba(153,71,71,0.2)]"
                    >
                      Cerrar Turno
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-in slide-in-from-right-4">
                  <button 
                    onClick={() => {
                      setCashAction(null);
                      setInputValue('');
                    }}
                    className="text-cobrar-txt3 hover:text-white flex items-center gap-1 text-sm mb-4 transition-colors"
                  >
                    ← Volver
                  </button>
                  <h2 className="text-lg font-head font-bold text-white mb-1">
                    {cashAction === 'ingresar' ? 'Ingresar Efectivo' : cashAction === 'retirar' ? 'Retirar Efectivo' : 'Apertura de Caja'}
                  </h2>
                  <p className="text-sm text-cobrar-txt2 mb-6">
                    {cashAction === 'ingresar' ? 'Añade fondo a tu caja.' : cashAction === 'retirar' ? 'Retira dinero para pagos o extracción.' : 'Ingresa el monto inicial con el que arrancas el turno (cambio).'}
                  </p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-white mb-2">
                        {cashAction === 'abrir' ? 'Monto Inicial' : `Monto a ${cashAction}`}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-cobrar-txt2 font-bold">$</span>
                        <input 
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={inputValue}
                          onChange={(e) => {
                            setInputValue(e.target.value);
                            setErrorMsg('');
                          }}
                          placeholder="0.00"
                          className={`w-full bg-[#1a1a23] border rounded-xl py-3 pl-8 pr-4 text-white text-lg font-bold focus:outline-none transition-colors ${errorMsg ? 'border-red-500 focus:border-red-500' : 'border-cobrar-border focus:border-[#5252ff]'}`}
                          autoFocus
                        />
                      </div>
                      {errorMsg && (
                        <p className="text-red-400 text-xs mt-2 font-medium">{errorMsg}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white mb-2">Motivo (opcional)</label>
                      <input 
                        type="text"
                        placeholder="Ej. Cambio, Pago a proveedor..."
                        className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#5252ff] transition-colors"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleCashSubmit}
                    className="w-full bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex justify-center"
                  >
                    Confirmar {cashAction === 'ingresar' ? 'Ingreso' : cashAction === 'retirar' ? 'Retiro' : 'Apertura'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
