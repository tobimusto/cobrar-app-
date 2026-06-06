import { useState } from 'react';
import { Search, Filter, Mail, UserPlus, Shield, X, ChevronDown } from 'lucide-react';

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('crear'); // crear | invitar

  return (
    <div className="flex flex-col h-full bg-cobrar-bg overflow-y-auto p-8 custom-scrollbar">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-head font-bold text-white">Usuarios</h1>
          <p className="text-sm text-cobrar-txt2">Gestiona el equipo de tu negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm font-medium text-cobrar-txt2 hover:text-white transition-colors bg-cobrar-bg2 px-4 py-2.5 rounded-xl border border-cobrar-border">
            <Mail size={16} /> Invitaciones Pendientes
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <UserPlus size={18} />
            Agregar Usuario
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-cobrar-bg3 border border-cobrar-border rounded-2xl flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-cobrar-border bg-cobrar-bg2 flex justify-between items-center shrink-0">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cobrar-txt2" size={18} />
            <input 
              type="text" 
              placeholder="Buscar usuarios..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-cobrar-bg border border-cobrar-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#5252ff]/50 transition-colors"
            />
          </div>
          <button className="bg-cobrar-bg border border-cobrar-border hover:bg-cobrar-bg2 px-4 py-2 rounded-xl text-sm font-medium transition-colors text-white flex items-center gap-2">
            <Filter size={16} /> Filtros
          </button>
        </div>

        {/* Header content */}
        <div className="p-6 border-b border-cobrar-border bg-cobrar-bg2">
          <h3 className="font-bold text-white text-sm">Mi equipo</h3>
          <p className="text-xs text-cobrar-txt2 mt-1">Gestiona los accesos y roles dentro de tu negocio.</p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-cobrar-bg2 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Nombre</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Email</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Rol</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border">Último acceso</th>
                <th className="p-4 font-head font-semibold text-xs tracking-wider text-cobrar-txt2 uppercase border-b border-cobrar-border text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cobrar-border">
              <tr className="hover:bg-cobrar-bg2/50 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#5252ff]/20 text-[#5252ff] flex items-center justify-center font-bold text-xs">
                      TÚ
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">Usuario Principal</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-cobrar-txt2 text-sm">admin@tu-kiosco.com</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#5252ff]/10 text-[#5252ff] border border-[#5252ff]/20">
                    <Shield size={12} /> Propietario
                  </span>
                </td>
                <td className="p-4 text-cobrar-txt2 text-sm">Hoy, 16:00</td>
                <td className="p-4 text-right text-cobrar-txt3">...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Agregar Usuario Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-cobrar-border rounded-2xl w-full max-w-[450px] overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-cobrar-txt3 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="p-6 pb-4 border-b border-transparent">
              <h2 className="text-lg font-head font-bold text-white mb-1">Agregar usuario al negocio</h2>
              <p className="text-sm text-cobrar-txt2">Invita una cuenta existente o crea una nueva para tu empleado</p>
            </div>

            <div className="px-6 mb-6">
              <div className="flex bg-[#1a1a23] p-1 rounded-lg border border-cobrar-border">
                <button 
                  onClick={() => setActiveTab('crear')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'crear' ? 'bg-[#2a2a35] text-white shadow' : 'text-cobrar-txt2 hover:text-white'}`}
                >
                  Crear cuenta
                </button>
                <button 
                  onClick={() => setActiveTab('invitar')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'invitar' ? 'bg-[#2a2a35] text-white shadow' : 'text-cobrar-txt2 hover:text-white'}`}
                >
                  Invitar existente
                </button>
              </div>
            </div>

            <div className="p-6 pt-0 space-y-4">
              {activeTab === 'crear' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Nombre</label>
                    <input 
                      type="text" 
                      placeholder="Nombre y apellido"
                      className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Usuario</label>
                    <input 
                      type="text" 
                      placeholder="usuario.empleado"
                      className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Email (opcional)</label>
                    <input 
                      type="email" 
                      placeholder="empleado@empresa.com"
                      className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white mb-2">Contraseña</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••"
                      className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors tracking-widest"
                    />
                  </div>
                </>
              )}
              
              {activeTab === 'invitar' && (
                <div>
                  <label className="block text-xs font-bold text-white mb-2">Email del usuario</label>
                  <input 
                    type="email" 
                    placeholder="email@existente.com"
                    className="w-full bg-[#1a1a23] border border-cobrar-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors"
                  />
                  <p className="text-xs text-cobrar-txt2 mt-2">Le enviaremos un correo con el link para aceptar la invitación.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white mb-2 mt-2">Rol</label>
                <div className="relative">
                  <select className="w-1/2 bg-[#1a1a23] border border-cobrar-border rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-[#5252ff]/50 text-white transition-colors appearance-none">
                    <option>Empleado</option>
                    <option>Administrador</option>
                  </select>
                  <ChevronDown className="absolute right-[52%] top-1/2 -translate-y-1/2 text-cobrar-txt2 pointer-events-none" size={16} />
                </div>
              </div>

              <button className="w-full bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-3.5 rounded-xl transition-all text-sm mt-4 shadow-[0_4px_20px_rgba(82,82,255,0.2)]">
                {activeTab === 'crear' ? 'Crear y asignar cuenta' : 'Enviar invitación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
