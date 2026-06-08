import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      toast.error(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
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

      <div className="w-full max-w-md bg-[#16161d] border border-cobrar-border rounded-2xl p-4 md:p-8 shadow-2xl relative overflow-hidden">
        
        {success ? (
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-green-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/20">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Correo Enviado</h2>
            <p className="text-cobrar-txt2 text-sm leading-relaxed mb-6">
              Te enviamos un enlace de recuperación a <strong>{email}</strong>. Por favor, revisá tu bandeja de entrada o spam.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-[#1a1a23] hover:bg-cobrar-bg3 border border-cobrar-border py-3.5 rounded-xl text-white font-medium transition-all"
            >
              Volver al Login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Recuperar contraseña</h2>
              <p className="text-cobrar-txt2 text-sm">Ingresá el email asociado a tu cuenta</p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-5">
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
                    placeholder="tu@negocio.com"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(82,82,255,0.25)] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-cobrar-txt3 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} /> Volver al Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
