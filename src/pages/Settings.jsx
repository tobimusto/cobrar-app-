import { useState, useEffect } from 'react';
import { Save, Clock } from 'lucide-react';

export default function Settings() {
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('20:00');

  useEffect(() => {
    const savedOpening = localStorage.getItem('cobrar_opening_time') || '08:00';
    const savedClosing = localStorage.getItem('cobrar_closing_time') || '20:00';
    setOpeningTime(savedOpening);
    setClosingTime(savedClosing);
  }, []);

  const handleSave = () => {
    localStorage.setItem('cobrar_opening_time', openingTime);
    localStorage.setItem('cobrar_closing_time', closingTime);
    alert('Configuración guardada correctamente.');
    // Trigger a storage event manually if needed, or reload to reflect changes
    window.location.reload();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-head font-bold text-white mb-2">Configuración</h1>
        <p className="text-cobrar-txt2">Ajustá las preferencias de tu negocio y aplicación.</p>
      </div>

      <div className="bg-cobrar-bg2 border border-cobrar-border rounded-2xl overflow-hidden mb-6">
        <div className="p-6 border-b border-cobrar-border">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-[#5252ff]" /> Horarios del Negocio
          </h2>
          <p className="text-sm text-cobrar-txt2 mt-1">
            Se mostrará un recordatorio para abrir o cerrar la caja según estos horarios.
          </p>
        </div>
        
        <div className="p-6 grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-white mb-2">Horario de Apertura</label>
            <input 
              type="time" 
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#5252ff] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white mb-2">Horario de Cierre</label>
            <input 
              type="time" 
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="w-full bg-[#1a1a23] border border-cobrar-border rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#5252ff] transition-colors"
            />
          </div>
        </div>
        
        <div className="p-4 bg-cobrar-bg3 border-t border-cobrar-border flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-[#5252ff] hover:bg-[#6666ff] text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2"
          >
            <Save size={16} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
