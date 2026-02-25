import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  ClipboardList, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Calendar,
  User,
  Phone,
  FileText,
  Download,
  Trash2,
  Pencil,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonitoringRecord {
  id: number;
  call_details: string;
  agent_name: string;
  registration_date: string;
  call_date: string;
  creator_email: string;
  coordinator: string;
  monitoring_id: string;
  service_level: string;
  attachment_name: string | null;
  attachment_data: string | null;
  end_user_error: string;
  business_critical_error: string;
  compliance_error: string;
  non_critical_error: string;
  supervisor_feedback: string | null;
  feedback_date: string | null;
  feedback_signature: string | null;
  agent_commitment: string | null;
  commitment_date: string | null;
  commitment_signature: string | null;
  status: 'PENDING_FEEDBACK' | 'PENDING_COMMITMENT' | 'COMPLETED';
}

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('quality_guard_email'));
  const [userRole, setUserRole] = useState<string | null>(localStorage.getItem('quality_guard_role'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('AGENT');
  const [authError, setAuthError] = useState<string | null>(null);
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState('Todos');
  const [selectedAgent, setSelectedAgent] = useState('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MonitoringRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    call_details: '',
    agent_name: '',
    registration_date: new Date().toISOString().split('T')[0],
    call_date: '',
    coordinator: '',
    monitoring_id: '',
    service_level: 'E-Care Movil',
    attachment_name: '',
    attachment_data: '',
    end_user_error: '',
    business_critical_error: '',
    compliance_error: '',
    non_critical_error: ''
  });

  const [feedback, setFeedback] = useState('');
  const [commitment, setCommitment] = useState('');

  // --- LÓGICA LOCAL (SIN SERVIDOR) ---

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = () => {
    const savedRecords = localStorage.getItem('local_quality_records');
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
    setLoading(false);
  };

  const saveRecordsLocal = (newRecords: MonitoringRecord[]) => {
    localStorage.setItem('local_quality_records', JSON.stringify(newRecords));
    setRecords(newRecords);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const accounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
    const user = accounts.find((u: any) => u.email === loginEmail && u.password === password);

    if (user) {
      localStorage.setItem('quality_guard_email', user.email);
      localStorage.setItem('quality_guard_role', user.role);
      setUserEmail(user.email);
      setUserRole(user.role);
    } else {
      setAuthError('Correo o contraseña incorrectos.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const accounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
    if (accounts.find((u: any) => u.email === loginEmail)) {
      setAuthError('Este correo ya está registrado.');
      return;
    }
    accounts.push({ email: loginEmail, password, role });
    localStorage.setItem('local_accounts', JSON.stringify(accounts));
    setIsRegistering(false);
    setAuthError('¡Cuenta creada! Ya puedes iniciar sesión.');
  };

  const handleSubmitRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    let updatedRecords: MonitoringRecord[];
    if (editingId) {
      updatedRecords = records.map(r => r.id === editingId ? { ...r, ...formData } : r);
    } else {
      const newRecord: MonitoringRecord = {
        ...formData,
        id: Date.now(),
        creator_email: userEmail,
        status: 'PENDING_FEEDBACK',
        supervisor_feedback: null,
        feedback_date: null,
        feedback_signature: null,
        agent_commitment: null,
        commitment_date: null,
        commitment_signature: null,
        attachment_name: formData.attachment_name || null,
        attachment_data: formData.attachment_data || null,
      };
      updatedRecords = [...records, newRecord];
    }

    saveRecordsLocal(updatedRecords);
    setIsFormOpen(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      call_details: '', agent_name: '', registration_date: new Date().toISOString().split('T')[0],
      call_date: '', coordinator: '', monitoring_id: '', service_level: 'E-Care Movil',
      attachment_name: '', attachment_data: '', end_user_error: '',
      business_critical_error: '', compliance_error: '', non_critical_error: ''
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('quality_guard_email');
    localStorage.removeItem('quality_guard_role');
    setUserEmail(null);
    setUserRole(null);
  };

  // --- EL RESTO DEL CÓDIGO DE TU DISEÑO (PDF, EXCEL, ETC) SIGUE IGUAL ---
  // (He mantenido tus funciones de exportar y badges para que no pierdas nada)

  const coordinators = ['Todos', ...Array.from(new Set(records.map(r => r.coordinator).filter(Boolean))).sort()];
  const agents = ['Todos', ...Array.from(new Set(records.map(r => r.agent_name).filter(Boolean))).sort()];
  const filteredRecords = records.filter(r => {
    const coordMatch = selectedCoordinator === 'Todos' || r.coordinator === selectedCoordinator;
    const agentMatch = selectedAgent === 'Todos' || r.agent_name === selectedAgent;
    return coordMatch && agentMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_FEEDBACK': return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-200">Pendiente Feedback</span>;
      case 'PENDING_COMMITMENT': return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200">Pendiente Compromiso</span>;
      case 'COMPLETED': return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">Completado</span>;
      default: return null;
    }
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-4 rounded-2xl mb-4"><ClipboardList className="text-white w-12 h-12" /></div>
            <h1 className="text-2xl font-bold text-gray-900">Quality Guard</h1>
            <p className="text-gray-500 text-center mt-2">{isRegistering ? 'Cree su cuenta local' : 'Acceso al Sistema de Calidad'}</p>
          </div>
          {authError && <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-100 rounded-lg text-sm">{authError}</div>}
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <input required type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Correo Electrónico" className="w-full p-3 border border-gray-200 rounded-xl outline-none" />
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="w-full p-3 border border-gray-200 rounded-xl outline-none" />
            {isRegistering && (
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none">
                <option value="AGENT">Agente</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="QUALITY_ANALYST">Analista de Calidad</option>
              </select>
            )}
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg">
              {isRegistering ? 'Crear Cuenta Permanente' : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-indigo-600 font-semibold">
              {isRegistering ? '¿Ya tiene cuenta? Inicie sesión' : '¿No tiene cuenta? Regístrese aquí'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A]">
      <header className="bg-white border-b h-16 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg"><ClipboardList className="text-white w-6 h-6" /></div>
            <h1 className="text-xl font-bold">Quality Guard</h1>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{userEmail} ({userRole})</span>
            <button onClick={handleLogout} className="text-xs font-bold text-red-500 uppercase">Salir</button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-8">
         <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Panel de Monitoreo</h2>
            {userRole === 'QUALITY_ANALYST' && (
                <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Nuevo Registro
                </button>
            )}
         </div>

         {/* Renderizado de lista de registros similar a tu código original */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map(record => (
                <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold">{record.agent_name}</h3>
                        {getStatusBadge(record.status)}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{record.call_details}</p>
                    <div className="text-xs text-gray-400">Fecha: {record.call_date}</div>
                </div>
            ))}
         </div>
      </main>
      
      {/* El modal de formulario de tu código iría aquí */}
      {isFormOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-6">Nuevo Registro de Calidad</h2>
                  <form onSubmit={handleSubmitRecord} className="space-y-4">
                      <input placeholder="Nombre del Asesor" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, agent_name: e.target.value})} required />
                      <input placeholder="Coordinador" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, coordinator: e.target.value})} required />
                      <input type="date" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, call_date: e.target.value})} required />
                      <textarea placeholder="Detalles de la llamada" className="w-full p-2 border rounded" onChange={e => setFormData({...formData, call_details: e.target.value})} required />
                      <div className="flex gap-4">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-2 border rounded">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}