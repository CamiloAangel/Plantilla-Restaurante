'use client';

import { useEffect, useState } from 'react';
import StaffCard from './StaffCard';
import StaffModal from './StaffModal';

export interface Staff {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
  role?: string;
}

export interface StaffFormInput {
  name: string;
  email?: string | null;
  password?: string;
  phone?: string | null;
  image?: string | null;
  role?: string;
}

const readApiErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Si el body no es JSON
  }
  return `La solicitud falló con estado ${response.status}.`;
};

export default function StaffSection() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch('/api/admin/staff', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response));
      }

      const payload = (await response.json()) as { data?: Staff[] };
      setStaff(payload.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar el personal.';
      console.warn('Staff fetch warning:', message);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este mesero?')) return;

    try {
      const response = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response));
      }

      setStaff((currentStaff) => currentStaff.filter((s) => s.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar personal.';
      console.warn('Staff delete warning:', message);
      alert(message);
    }
  };

  const handleSaveStaff = async (newStaff: StaffFormInput) => {
    try {
      const endpoint = editingStaff
        ? `/api/admin/staff/${editingStaff.id}`
        : '/api/admin/staff';
      const method = editingStaff ? 'PATCH' : 'POST';

      const payloadData = editingStaff
        ? {
            name: newStaff.name,
            phone: newStaff.phone || null,
            image: newStaff.image || null,
            role: 'Mesero',
          }
        : {
            name: newStaff.name,
            email: newStaff.email?.trim() || null,
            password: newStaff.password || '',
            phone: newStaff.phone || null,
            image: newStaff.image || null,
            role: 'Mesero',
          };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadData),
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response));
      }

      const payload = (await response.json()) as { data?: Staff };

      if (!payload.data) {
        throw new Error('Respuesta inválida del servidor.');
      }

      if (editingStaff) {
        setStaff((currentStaff) =>
          currentStaff.map((s) => (s.id === editingStaff.id ? payload.data! : s))
        );
      } else {
        setStaff((currentStaff) => [payload.data!, ...currentStaff]);
      }

      setErrorMessage(null);
      setIsModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar personal.';
      console.warn('Staff save warning:', message);
      alert(message);
    }
  };

  const stats = {
    active: staff.length,
    retention: '98%',
  };

  return (
    <main className="w-full min-h-screen bg-white md:ml-64 md:w-[calc(100%-16rem)]">
      <div className="w-full pt-20 md:pt-8 pb-20 text-black">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-full">
          
          {/* Header Section */}
          <section className="mb-12 relative">
            <h2 className="text-5xl sm:text-6xl md:text-8xl font-black font-headline text-orange-500 italic tracking-tighter leading-none mb-4">
              Vastago Crew.
            </h2>
            <div className="w-24 h-2 bg-orange-500 mb-6"></div>
            <p className="max-w-xl text-lg text-black font-body leading-relaxed">
              El corazón de nuestro laboratorio culinario. La excelencia de nuestros Meseros, los alquimistas que convierten ingredientes en oro urbano.
            </p>
            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {errorMessage}
              </div>
            )}
          </section>

          {/* Staff Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-black font-medium">Cargando personal...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staff.map((staffMember) => (
                <StaffCard
                  key={staffMember.id}
                  staff={staffMember}
                  onEdit={handleEditStaff}
                  onDelete={handleDeleteStaff}
                />
              ))}

              {/* Add New Staff */}
              <button
                onClick={handleAddStaff}
                className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-xl flex flex-col items-center justify-center p-8 group hover:bg-yellow-100 cursor-pointer transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-yellow-400 text-black flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">person_add</span>
                </div>
                <span className="font-headline font-black text-black uppercase tracking-tight">Añadir Mesero</span>
              </button>
            </div>
          )}

          {/* Footer Stats */}
          <section className="mt-20 p-8 bg-gray-100 rounded-2xl flex flex-wrap gap-12 items-center justify-between">
            <div className="flex flex-col">
              <span className="text-4xl font-black font-headline text-black">{stats.active}</span>
              <span className="text-xs uppercase tracking-widest font-bold text-black">Meseros Activos</span>
            </div>
            <div className="flex flex-col">
              <span className="text-4xl font-black font-headline text-black">{stats.retention}</span>
              <span className="text-xs uppercase tracking-widest font-bold text-black">Tasa de Retención</span>
            </div>
            <div className="ml-auto">
              <button className="px-6 py-3 bg-black text-white font-black rounded-lg uppercase tracking-tight hover:scale-105 transition-transform">
                Exportar Reportes
              </button>
            </div>
          </section>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <StaffModal
            staff={editingStaff}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveStaff}
          />
        )}

        {/* FAB */}
        <button
          onClick={handleAddStaff}
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-yellow-400 rounded-full text-black shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    </main>
  );
}