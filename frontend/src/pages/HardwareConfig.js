import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { toast } from 'sonner';
import api, { formatApiError } from '@/lib/api';

const HardwareConfig = () => {
  const [mode, setMode] = useState('VALIDATION'); // 'VALIDATION' o 'ASSIGNMENT'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [statusScreen, setStatusScreen] = useState(null); // { type: 'success' | 'error' | 'warning', message: '' }
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Serial API state
  const [serialConnected, setSerialConnected] = useState(false);

  // Refs para evitar "stale closures" en el bucle del Serial y Teclado
  const modeRef = useRef(mode);
  const selectedUserIdRef = useRef(selectedUserId);
  
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedUserIdRef.current = selectedUserId; }, [selectedUserId]);

  const bufferRef = useRef(''); // Guarda los números escaneados (para modo teclado)
  const timeoutRef = useRef(null);

  // Cargar usuarios
  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/admin/users');
        if (active) {
          setUsers(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          toast.error("Error cargando usuarios: " + formatApiError(err));
          setLoading(false);
        }
      }
    };
    fetchUsers();
    return () => { active = false; };
  }, []);

  // ====== MODO 1: Lector de Teclado (HID) ======
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.length > 1 && e.key !== 'Enter') return;

      if (e.key === 'Enter') {
        const scannedCode = bufferRef.current;
        if (scannedCode.length > 0) {
          handleScanWithRefs(scannedCode);
        }
        bufferRef.current = ''; 
        return;
      }

      bufferRef.current += e.key;

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, 100); 
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencias vacías porque usa refs internamente

  // ====== MODO 2: Web Serial API (Arduino UNO Directo) ======
  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      toast.error('Tu navegador no soporta Web Serial API. Usa Chrome, Edge u Opera en PC.');
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      setSerialConnected(true);
      toast.success('Arduino conectado exitosamente por Serial.');

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let serialBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          reader.releaseLock();
          break;
        }
        if (value) {
          serialBuffer += value;
          const lines = serialBuffer.split('\n');
          // Procesar todas las líneas completas
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line && line !== "INICIADO") {
              handleScanWithRefs(line);
            }
          }
          // Guardar lo incompleto para el siguiente ciclo
          serialBuffer = lines[lines.length - 1];
        }
      }
    } catch (error) {
      console.error(error);
      if (error.name === 'NotFoundError') {
        toast.info('Cancelaste la conexión del puerto serial.');
      } else {
        toast.error('Error al conectar con Arduino: ' + error.message);
      }
      setSerialConnected(false);
    }
  };

  // ====== LÓGICA COMÚN ======
  const handleScanWithRefs = async (rfidUid) => {
    const currentMode = modeRef.current;
    const currentUserId = selectedUserIdRef.current;

    if (currentMode === 'ASSIGNMENT') {
      if (!currentUserId) {
        toast.error('Por favor selecciona un usuario primero.');
        return;
      }
      assignCardToUser(currentUserId, rfidUid);
    } else {
      verifyCardAccess(rfidUid);
    }
  };

  const assignCardToUser = async (userId, rfidUid) => {
    try {
      const { data } = await api.post('/hardware/assign-card', {
        userId: userId, 
        rfidUid 
      });
      
      setShowConfetti(true);
      setStatusScreen({ type: 'success', message: `Tarjeta vinculada a ${data.name}` });
      setTimeout(() => {
        setShowConfetti(false);
        setStatusScreen(null);
        setSelectedUserId(''); // Reset UI selector
      }, 4000);
      
    } catch (error) {
      setStatusScreen({ type: 'error', message: formatApiError(error) || 'Error al asignar' });
      setTimeout(() => setStatusScreen(null), 3000);
    }
  };

  const verifyCardAccess = async (rfidUid) => {
    try {
      const { data } = await api.get(`/hardware/verify-access?rfidUid=${rfidUid}`);

      if (data.status === 'ACTIVE') {
        setStatusScreen({ type: 'success', message: `ACCESO PERMITIDO - ${data.name}` });
      } else if (data.status === 'EXPIRED') {
        setStatusScreen({ type: 'error', message: `ACCESO DENEGADO - Suscripción vencida` });
      } else {
        setStatusScreen({ type: 'warning', message: 'ACCESO DENEGADO - Tarjeta no registrada' });
      }

      setTimeout(() => setStatusScreen(null), 3000);
    } catch (error) {
      console.error(error);
      toast.error('Error de conexión con el servidor.');
    }
  };

  if (statusScreen) {
    const bgColors = {
      success: 'bg-green-500',
      error: 'bg-red-600',
      warning: 'bg-orange-500'
    };

    return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center ${bgColors[statusScreen.type]} transition-colors duration-300`}>
        {showConfetti && <Confetti />}
        <h1 className="text-white text-6xl font-bold text-center px-4 drop-shadow-md">
          {statusScreen.message}
        </h1>
      </div>
    );
  }

  // Interfaz Principal
  return (
    <div className="max-w-2xl mx-auto p-8 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mt-4 mb-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight">Control RFID</h2>
            
            {/* Toggle Mode */}
            <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
              <button 
                className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'VALIDATION' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setMode('VALIDATION')}
              >
                Validación
              </button>
              <button 
                className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'ASSIGNMENT' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setMode('ASSIGNMENT')}
              >
                Asignación
              </button>
            </div>
          </div>

          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-black/20 mb-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            
            {!serialConnected && (
              <div className="mb-8">
                <button 
                  onClick={connectSerial}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 px-6 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Conectar Arduino UNO 
                </button>
                <p className="text-xs text-zinc-500 mt-3">Solo en Chrome/Edge PC. O usa un lector USB normal y simplemente escanea.</p>
              </div>
            )}

            <div className="animate-pulse mb-6 flex justify-center">
              <svg className={`w-20 h-20 ${serialConnected ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
              </svg>
            </div>
            
            <p className="text-2xl font-semibold text-white tracking-tight">
              {serialConnected ? 'Arduino Conectado. Esperando tarjeta...' : 'Esperando tarjeta...'}
            </p>
            <p className="text-sm text-zinc-400 mt-3">Acerca el llavero o tarjeta al lector</p>
          </div>

          {/* Selectores solo en modo asignación */}
          {mode === 'ASSIGNMENT' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <label className="block text-sm font-medium text-zinc-300">Seleccionar Usuario para Asignar:</label>
              <select 
                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loading}
              >
                <option value="" className="bg-zinc-900 text-zinc-400">-- Selecciona un usuario --</option>
                {users.map(user => (
                  <option key={user.id} value={user.id} className="bg-zinc-900 text-white">
                    {user.name} ({user.email || 'Sin correo'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
  );
};

export default HardwareConfig;
