import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, User, Mail, Lock, Phone, LayoutDashboard, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Wizard States
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [initialCash, setInitialCash] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const { error } = await signIn({ email, password });
      if (error) throw error;
      navigate('/pos');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    try {
      setError('');
      setLoading(true);
      // Extra data can be passed in metadata if needed, but for MVP we just sign up
      const { error } = await signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: name,
            business_name: businessName,
            category: category,
            phone: phone,
            initial_cash: initialCash
          }
        }
      });
      if (error) throw error;
      navigate('/pos');
    } catch (err) {
      setError(err.message || 'Error al registrarse');
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!email || !password)) return setError('Completá email y clave');
    if (step === 2 && (!name || !businessName)) return setError('Completá nombre y negocio');
    if (step === 3 && (!category)) return setError('Seleccioná un rubro');
    
    setError('');
    if (step < 4) setStep(step + 1);
    else handleRegisterSubmit();
  };

  const renderWizardStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email del comercio</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-[#5252ff]/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff] text-white transition-colors"
                  placeholder="tu@negocio.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-[#5252ff]/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff] text-white transition-colors tracking-widest"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm font-medium text-white mb-2">¿Cómo te llamás?</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <input 
                  type="text" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-[#5252ff]/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff] text-white transition-colors"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Nombre de tu negocio</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <input 
                  type="text" 
                  required 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-[#5252ff]/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff] text-white transition-colors"
                  placeholder="Kiosco El Sol"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm font-medium text-white mb-2">¿Cuál es tu rubro principal?</label>
              <div className="relative">
                <LayoutDashboard className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <select 
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-[#5252ff]/30 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff] text-white transition-colors appearance-none"
                >
                  <option value="" disabled>Seleccioná un rubro...</option>
                  <option value="kiosco">Kiosco / Despensa</option>
                  <option value="almacen">Almacén / Minimercado</option>
                  <option value="indumentaria">Indumentaria / Ropa</option>
                  <option value="gastronomia">Gastronomía</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Teléfono (opcional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                  placeholder="+54 9 11..."
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
            <div className="bg-[#5252ff]/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-[#5252ff]/20">
              <CheckCircle2 size={32} className="text-[#5252ff]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">¡Todo listo! Último paso</h3>
              <p className="text-sm text-cobrar-txt2">Para arrancar, decinos con cuánto efectivo abrís tu caja hoy.</p>
            </div>
            <div className="relative max-w-[200px] mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-white">$</span>
              <input 
                type="number" 
                required 
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                className="w-full bg-[#1a1a23] border border-[#5252ff] rounded-xl py-4 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-[#5252ff]/50 text-white text-xl font-bold text-center transition-all shadow-[0_0_15px_rgba(82,82,255,0.15)]"
                placeholder="0"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-12 h-12 bg-[#5252ff] rounded-xl flex items-center justify-center font-head font-bold text-white text-xl mb-3 shadow-[0_4px_20px_rgba(82,82,255,0.3)]">
          C
        </div>
        <span className="font-head font-bold text-2xl tracking-tight text-white">Cobr<span className="text-[#5252ff]">AR</span></span>
      </div>

      <div className="w-full max-w-md bg-[#16161d] border border-cobrar-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Toggle / Header */}
        <div className="mb-8">
          {isLogin ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Bienvenido de nuevo</h2>
              <p className="text-cobrar-txt2 text-sm">Ingresá para gestionar tu negocio</p>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Crear cuenta</h2>
                <p className="text-cobrar-txt2 text-sm">Paso {step} de 4</p>
              </div>
              {/* Wizard Progress Dots */}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[#5252ff]' : i < step ? 'w-2 bg-cobrar-green' : 'w-2 bg-cobrar-txt3'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm mb-6 animate-in fade-in">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                  placeholder="admin@comercio.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando...' : 'Ingresar'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {renderWizardStep()}
            
            <button 
              onClick={nextStep}
              disabled={loading}
              className="w-full bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
            >
              {step < 4 ? (
                <>Continuar <ChevronRight size={18} /></>
              ) : (
                <>{loading ? 'Creando cuenta...' : 'Finalizar y entrar'}</>
              )}
            </button>
            
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="w-full py-2 text-sm text-cobrar-txt2 hover:text-white transition-colors"
              >
                Volver atrás
              </button>
            )}
          </div>
        )}

        {/* Footer Link */}
        {!isLogin && step > 1 ? null : (
          <div className="mt-8 text-center text-sm text-cobrar-txt2 border-t border-cobrar-border pt-6">
            {isLogin ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setStep(1);
                setError('');
              }}
              className="text-[#5252ff] font-bold hover:underline ml-1"
            >
              {isLogin ? 'Registrate gratis' : 'Iniciá sesión'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-cobrar-txt3 flex items-center gap-2">
        <span>Desarrollado por</span>
        <a 
          href="https://codetm.site" 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-head font-bold text-white hover:text-[#5252ff] transition-colors tracking-wide"
        >
          CodeTM
        </a>
      </div>
    </div>
  );
}
