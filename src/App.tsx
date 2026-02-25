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
  Paperclip,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  // Form states
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

  useEffect(() => {
    if (userEmail) {
      fetchRecords();
    }
  }, [userEmail]);

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/records');
      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;
    try {
      const url = editingId ? `/api/records/${editingId}` : '/api/records';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, creator_email: userEmail })
      });
      
      if (response.ok) {
        setIsFormOpen(false);
        setEditingId(null);
        setFormData({
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
        fetchRecords();
      }
    } catch (error) {
      console.error('Error submitting record:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedRecord || !userEmail) return;
    try {
      const response = await fetch(`/api/records/${selectedRecord.id}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          supervisor_feedback: feedback,
          feedback_signature: userEmail
        })
      });
      if (response.ok) {
        setFeedback('');
        fetchRecords();
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleSubmitCommitment = async () => {
    if (!selectedRecord || !userEmail) return;
    try {
      const response = await fetch(`/api/records/${selectedRecord.id}/commitment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agent_commitment: commitment,
          commitment_signature: userEmail
        })
      });
      if (response.ok) {
        setCommitment('');
        fetchRecords();
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error('Error submitting commitment:', error);
    }
  };

  const handleEditRecord = (record: MonitoringRecord) => {
    setEditingId(record.id);
    setFormData({
      call_details: record.call_details,
      agent_name: record.agent_name,
      registration_date: record.registration_date,
      call_date: record.call_date,
      coordinator: record.coordinator,
      monitoring_id: record.monitoring_id,
      service_level: record.service_level || 'E-Care Movil',
      attachment_name: record.attachment_name || '',
      attachment_data: record.attachment_data || '',
      end_user_error: record.end_user_error,
      business_critical_error: record.business_critical_error,
      compliance_error: record.compliance_error,
      non_critical_error: record.non_critical_error
    });
    setIsFormOpen(true);
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      // Optimistic update for immediate feedback
      setRecords(prev => prev.filter(r => r.id !== id));
      setSelectedRecord(null);

      const response = await fetch(`/api/records/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Error al eliminar el registro');
        fetchRecords(); // Rollback on error
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      fetchRecords(); // Rollback on error
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    }

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          attachment_name: file!.name,
          attachment_data: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadAttachment = (name: string, data: string) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_FEEDBACK':
        return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-200">Pendiente Feedback</span>;
      case 'PENDING_COMMITMENT':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200">Pendiente Compromiso</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">Completado</span>;
      default:
        return null;
    }
  };

  const downloadPDF = (record: MonitoringRecord) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text("Reporte de Monitoreo de Calidad", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID Registro: #${record.id} | ID Monitoreo: ${record.monitoring_id}`, 14, 30);
    
    // Basic Info Table
    autoTable(doc, {
      startY: 35,
      head: [['Campo', 'Información']],
      body: [
        ['Asesor', record.agent_name],
        ['Coordinador', record.coordinator],
        ['Nivel de Servicio', record.service_level],
        ['Fecha de Llamada', record.call_date],
        ['Fecha de Registro', record.registration_date],
        ['Registrado por', record.creator_email],
        ['Detalles de Llamada', record.call_details],
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    // Errors Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Tipo de Error', 'Descripción']],
      body: [
        ['Error Usuario Final', record.end_user_error],
        ['Error Crítico Negocio', record.business_critical_error],
        ['Error Cumplimiento', record.compliance_error],
        ['Error No Crítico', record.non_critical_error],
      ],
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] } // red-500
    });
    
    // Feedback Section
    if (record.supervisor_feedback) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Feedback / Coaching", 14, (doc as any).lastAutoTable.finalY + 15);
      
      doc.setFontSize(10);
      doc.setTextColor(50);
      const feedbackLines = doc.splitTextToSize(record.supervisor_feedback, 180);
      doc.text(feedbackLines, 14, (doc as any).lastAutoTable.finalY + 22);
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Firmado por: ${record.feedback_signature} el ${record.feedback_date}`, 14, (doc as any).lastAutoTable.finalY + 22 + (feedbackLines.length * 5));
    }
    
    // Commitment Section
    if (record.agent_commitment) {
      const startY = (doc as any).lastAutoTable.finalY + (record.supervisor_feedback ? 45 : 15);
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Compromiso de Mejora", 14, startY);
      
      doc.setFontSize(10);
      doc.setTextColor(50);
      const commitmentLines = doc.splitTextToSize(record.agent_commitment, 180);
      doc.text(commitmentLines, 14, startY + 7);
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Firmado por: ${record.commitment_signature} el ${record.commitment_date}`, 14, startY + 7 + (commitmentLines.length * 5));
    }
    
    doc.save(`Monitoreo_${record.agent_name}_${record.monitoring_id}.pdf`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('quality_guard_email', data.email);
        localStorage.setItem('quality_guard_role', data.role);
        setUserEmail(data.email);
        setUserRole(data.role);
        setLoginEmail('');
        setPassword('');
      } else {
        setAuthError(data.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      setAuthError('Error de conexión');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password, role })
      });
      const data = await response.json();
      if (response.ok) {
        setIsRegistering(false);
        setAuthError('Registro exitoso. Por favor inicie sesión.');
      } else {
        setAuthError(data.error || 'Error al registrarse');
      }
    } catch (error) {
      setAuthError('Error de conexión');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('quality_guard_email');
    localStorage.removeItem('quality_guard_role');
    setUserEmail(null);
    setUserRole(null);
  };

  const coordinators = ['Todos', ...Array.from(new Set(records.map(r => r.coordinator).filter(Boolean))).sort()];
  const agents = ['Todos', ...Array.from(new Set(records.map(r => r.agent_name).filter(Boolean))).sort()];
  
  const filteredRecords = records.filter(r => {
    const coordMatch = selectedCoordinator === 'Todos' || r.coordinator === selectedCoordinator;
    const agentMatch = selectedAgent === 'Todos' || r.agent_name === selectedAgent;
    return coordMatch && agentMatch;
  });

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-4 rounded-2xl mb-4">
              <ClipboardList className="text-white w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Quality Guard</h1>
            <p className="text-gray-500 text-center mt-2">
              {isRegistering 
                ? 'Cree su cuenta de acceso único' 
                : 'Sus registros están seguros en nuestra base de datos'}
            </p>
          </div>

          {isRegistering && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                <strong>Nota:</strong> Solo necesita registrarse una vez. Sus datos y registros se guardarán permanentemente para sus próximos ingresos.
              </p>
            </div>
          )}

          {authError && (
            <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${
              authError.includes('exitoso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {authError}
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Correo Electrónico</label>
              <input
                required
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contraseña</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="AGENT">Agente (Compromisos)</option>
                  <option value="SUPERVISOR">Supervisor (Feedback)</option>
                  <option value="QUALITY_ANALYST">Analista de Calidad (Monitoreos)</option>
                </select>
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              {isRegistering ? 'Crear Cuenta Permanente' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError(null);
              }}
              className="text-sm text-indigo-600 font-semibold hover:underline"
            >
              {isRegistering ? '¿Ya tiene cuenta? Inicie sesión' : '¿No tiene cuenta? Regístrese aquí'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ClipboardList className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Quality Guard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-gray-400 uppercase">Sesión iniciada ({userRole})</span>
              <span className="text-sm font-medium text-gray-700">{userEmail}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-xs font-bold text-red-500 hover:text-red-700 uppercase"
            >
              Salir
            </button>
          </div>
          <div className="h-8 w-[1px] bg-gray-200 mx-2" />
          <div className="flex items-center gap-3">
            <button 
              onClick={() => exportToExcel(records)}
              className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg transition-colors font-bold shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
            {userRole === 'QUALITY_ANALYST' && (
              <button 
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Nuevo Registro
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-6">
          <div className="flex-1 overflow-x-auto pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase mr-2 whitespace-nowrap">Coordinador:</span>
              {coordinators.map(coord => (
                <button
                  key={coord}
                  onClick={() => setSelectedCoordinator(coord)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCoordinator === coord 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {coord}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Agente:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {agents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Registros de Calidad</h2>
              <span className="text-sm text-gray-500">{filteredRecords.length} registros mostrados</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No hay registros para este filtro.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <motion.div
                    layoutId={`record-${record.id}`}
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                      selectedRecord?.id === record.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{record.agent_name}</h3>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {record.call_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {record.call_details.substring(0, 20)}...
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-400 w-5 h-5" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Detail / Action Section */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedRecord ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-24"
                >
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Detalle del Error</h2>
                      <p className="text-sm text-gray-500">ID: #{selectedRecord.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedRecord.status === 'COMPLETED' && (
                        <button
                          onClick={() => downloadPDF(selectedRecord)}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all font-bold shadow-lg shadow-emerald-100 active:scale-95"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-sm">Descargar PDF</span>
                        </button>
                      )}
                      {selectedRecord.status === 'PENDING_FEEDBACK' && userRole === 'QUALITY_ANALYST' && (
                        <>
                          <button
                            onClick={() => handleEditRecord(selectedRecord)}
                            className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar registro"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(selectedRecord.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Error Details */}
                    <div className="space-y-4">
                      <DetailItem icon={<FileText />} label="ID de Monitoreo" value={selectedRecord.monitoring_id} />
                      <DetailItem icon={<ClipboardList />} label="Nivel de Servicio" value={selectedRecord.service_level} />
                      <DetailItem icon={<User />} label="Coordinador" value={selectedRecord.coordinator} />
                      <DetailItem icon={<User />} label="Asesor" value={selectedRecord.agent_name} />
                      <DetailItem icon={<Phone />} label="Detalles de Llamada" value={selectedRecord.call_details} />
                      
                      {selectedRecord.attachment_name && (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <File className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-700 truncate">{selectedRecord.attachment_name}</span>
                          </div>
                          <button 
                            onClick={() => downloadAttachment(selectedRecord.attachment_name!, selectedRecord.attachment_data!)}
                            className="text-xs font-bold text-indigo-600 hover:underline flex-shrink-0"
                          >
                            Descargar
                          </button>
                        </div>
                      )}

                      <DetailItem icon={<Calendar />} label="Fecha de Llamada" value={selectedRecord.call_date} />
                      <DetailItem icon={<Calendar />} label="Fecha Registro" value={selectedRecord.registration_date} />
                      <DetailItem icon={<User />} label="Registrado por" value={selectedRecord.creator_email} />
                      
                      <div className="pt-4 space-y-3">
                        <ErrorBox title="Error Usuario Final" content={selectedRecord.end_user_error} color="red" />
                        <ErrorBox title="Error Crítico Negocio" content={selectedRecord.business_critical_error} color="orange" />
                        <ErrorBox title="Error Cumplimiento" content={selectedRecord.compliance_error} color="purple" />
                        <ErrorBox title="Error No Crítico" content={selectedRecord.non_critical_error} color="blue" />
                      </div>
                    </div>

                    {/* Feedback Section */}
                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        Feedback / Coaching
                      </h3>
                      {selectedRecord.supervisor_feedback ? (
                        <div className="space-y-2">
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-900 italic">
                            "{selectedRecord.supervisor_feedback}"
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <p className="text-[10px] text-gray-400 font-medium">Firma: {selectedRecord.feedback_signature}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Fecha: {selectedRecord.feedback_date}</p>
                          </div>
                        </div>
                      ) : userRole === 'SUPERVISOR' ? (
                        <div className="space-y-3">
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Ingrese el feedback para el asesor..."
                            className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[100px]"
                          />
                          <button 
                            onClick={handleSubmitFeedback}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                          >
                            Guardar Feedback
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic text-center">Esperando feedback del supervisor.</p>
                      )}
                    </div>

                    {/* Commitment Section */}
                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Compromiso de Mejora
                      </h3>
                      {selectedRecord.agent_commitment ? (
                        <div className="space-y-2">
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-sm text-emerald-900 italic">
                            "{selectedRecord.agent_commitment}"
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <p className="text-[10px] text-gray-400 font-medium">Firma: {selectedRecord.commitment_signature}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Fecha: {selectedRecord.commitment_date}</p>
                          </div>
                        </div>
                      ) : selectedRecord.status === 'PENDING_COMMITMENT' && userRole === 'AGENT' ? (
                        <div className="space-y-3">
                          <textarea
                            value={commitment}
                            onChange={(e) => setCommitment(e.target.value)}
                            placeholder="Ingrese su compromiso de mejora..."
                            className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none min-h-[100px]"
                          />
                          <button 
                            onClick={handleSubmitCommitment}
                            className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                          >
                            Guardar Compromiso
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic text-center">
                          {selectedRecord.status === 'PENDING_FEEDBACK' 
                            ? 'Esperando feedback del supervisor para habilitar compromiso.' 
                            : 'Solo los agentes pueden cargar compromisos.'}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">Seleccione un registro para ver los detalles y acciones</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* New Record Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
                <h2 className="text-xl font-bold text-indigo-900">
                  {editingId ? 'Editar Registro de Error' : 'Nuevo Registro de Error Crítico'}
                </h2>
                <button 
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingId(null);
                    setFormData({
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
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <PlusCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmitRecord} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Asesor</label>
                    <input
                      required
                      type="text"
                      value={formData.agent_name}
                      onChange={(e) => setFormData({...formData, agent_name: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Fecha de Llamada</label>
                    <input
                      required
                      type="date"
                      value={formData.call_date}
                      onChange={(e) => setFormData({...formData, call_date: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">ID de Monitoreo</label>
                    <input
                      required
                      type="text"
                      value={formData.monitoring_id}
                      onChange={(e) => setFormData({...formData, monitoring_id: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre del Coordinador</label>
                    <input
                      required
                      type="text"
                      value={formData.coordinator}
                      onChange={(e) => setFormData({...formData, coordinator: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nivel de Servicio</label>
                    <select
                      value={formData.service_level}
                      onChange={(e) => setFormData({...formData, service_level: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="E-Care Movil">E-Care Movil</option>
                      <option value="E-care Fijo">E-care Fijo</option>
                      <option value="CC Movil">CC Movil</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Adjuntar Archivo (Opcional)</label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileChange(e);
                    }}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors cursor-pointer relative"
                  >
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Paperclip className="w-6 h-6 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {formData.attachment_name ? (
                          <span className="font-bold text-indigo-600">{formData.attachment_name}</span>
                        ) : (
                          "Arrastre un archivo aquí o haga clic para seleccionar"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Detalles de la Llamada (ID, Cliente, etc)</label>
                  <input
                    required
                    type="text"
                    value={formData.call_details}
                    onChange={(e) => setFormData({...formData, call_details: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-red-600 uppercase">Error Usuario Final</label>
                    <textarea
                      required
                      value={formData.end_user_error}
                      onChange={(e) => setFormData({...formData, end_user_error: e.target.value})}
                      className="w-full p-2 border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500 outline-none min-h-[80px] bg-red-50/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-orange-600 uppercase">Error Crítico de Negocio</label>
                    <textarea
                      required
                      value={formData.business_critical_error}
                      onChange={(e) => setFormData({...formData, business_critical_error: e.target.value})}
                      className="w-full p-2 border border-orange-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none min-h-[80px] bg-orange-50/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-purple-600 uppercase">Error de Cumplimiento</label>
                    <textarea
                      required
                      value={formData.compliance_error}
                      onChange={(e) => setFormData({...formData, compliance_error: e.target.value})}
                      className="w-full p-2 border border-purple-100 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none min-h-[80px] bg-purple-50/30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-600 uppercase">Error No Crítico</label>
                    <textarea
                      required
                      value={formData.non_critical_error}
                      onChange={(e) => setFormData({...formData, non_critical_error: e.target.value})}
                      className="w-full p-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] bg-blue-50/30"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingId(null);
                      setFormData({
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
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    {editingId ? 'Actualizar Registro' : 'Registrar Error'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const exportToExcel = (records: MonitoringRecord[]) => {
  const worksheet = XLSX.utils.json_to_sheet(records.map(r => ({
    'ID': r.id,
    'ID Monitoreo': r.monitoring_id,
    'Coordinador': r.coordinator,
    'Asesor': r.agent_name,
    'Detalles Llamada': r.call_details,
    'Registrado por': r.creator_email,
    'Fecha Registro': r.registration_date,
    'Fecha Llamada': r.call_date,
    'Error Usuario Final': r.end_user_error,
    'Error Crítico Negocio': r.business_critical_error,
    'Error Cumplimiento': r.compliance_error,
    'Error No Crítico': r.non_critical_error,
    'Feedback Supervisor': r.supervisor_feedback || 'N/A',
    'Firma Feedback': r.feedback_signature || 'N/A',
    'Fecha Feedback': r.feedback_date || 'N/A',
    'Compromiso Asesor': r.agent_commitment || 'N/A',
    'Firma Compromiso': r.commitment_signature || 'N/A',
    'Fecha Compromiso': r.commitment_date || 'N/A',
    'Estado': r.status
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registros de Calidad");
  
  XLSX.writeFile(workbook, `Reporte_Calidad_${new Date().toISOString().split('T')[0]}.xlsx`);
};

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-indigo-600 mt-1">{React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}</div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-700 font-medium">{value}</p>
      </div>
    </div>
  );
}

function ErrorBox({ title, content, color }: { title: string, content: string, color: 'red' | 'orange' | 'purple' | 'blue' }) {
  const colors = {
    red: 'bg-red-50 border-red-100 text-red-900',
    orange: 'bg-orange-50 border-orange-100 text-orange-900',
    purple: 'bg-purple-50 border-purple-100 text-purple-900',
    blue: 'bg-blue-50 border-blue-100 text-blue-900'
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[color]}`}>
      <p className="text-[10px] font-bold uppercase mb-1 opacity-60">{title}</p>
      <p className="text-xs leading-relaxed">{content}</p>
    </div>
  );
}
