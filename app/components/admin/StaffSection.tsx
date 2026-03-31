'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import StaffCard from './StaffCard';
import StaffModal from './StaffModal';

export interface Staff {
  id: string;
  name: string;
  role: string;
  position: string;
  image: string | null;
  email?: string;
  phone?: string;
}

const roleColors: Record<string, { badge: string; ring: string; icon: string }> = {
  Dueño: { badge: 'bg-secondary-container text-on-secondary-container', ring: 'ring-secondary-container', icon: 'crown' },
  Cocinero: { badge: 'bg-primary text-on-primary', ring: 'ring-primary', icon: 'restaurant' },
  Mesero: { badge: 'bg-tertiary-container text-on-tertiary-container', ring: 'ring-tertiary-container', icon: 'dining' },
};

export default function StaffSection() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
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
    if (!confirm('¿Estás seguro de que deseas eliminar este personal?')) return;

    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);

      if (error) throw error;
      setStaff(staff.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error al eliminar personal');
    }
  };

  const handleSaveStaff = async (newStaff: Omit<Staff, 'id'>) => {
    try {
      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(newStaff)
          .eq('id', editingStaff.id);

        if (error) throw error;
        setStaff(staff.map((s) => (s.id === editingStaff.id ? { ...s, ...newStaff } : s)));
      } else {
        const { data, error } = await supabase.from('staff').insert([newStaff]).select();

        if (error) throw error;
        if (data) setStaff([data[0], ...staff]);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Error al guardar personal');
    }
  };

  const stats = {
    active: staff.length,
    kitchen: staff.filter((s) => s.role === 'Cocinero').length,
    front: staff.filter((s) => s.role === 'Mesero').length,
    retention: '98%',
  };

  return (
    <main className="pl-24 md:pl-64 pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-8 pb-20">
        {/* Header Section */}
        <section className="mb-12 relative">
          <h2 className="text-6xl md:text-8xl font-black font-headline text-on-surface tracking-tighter leading-none mb-4">
            Vastago <br /> <span className="text-primary-container">Crew.</span>
          </h2>
          <div className="w-24 h-2 bg-secondary-container mb-6"></div>
          <p className="max-w-xl text-lg text-on-surface-variant font-body leading-relaxed">
            El corazón de nuestro laboratorio culinario. Desde la precisión de nuestros Cocineros hasta la excelencia de nuestros Meseros, estos son los alquimistas que convierten ingredientes en oro urbano.
          </p>
        </section>

        {/* Staff Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-neutral-400">Cargando personal...</p>
          </div>
        ) : (
          <div className="editorial-grid">
            {staff.map((staffMember) => (
              <StaffCard
                key={staffMember.id}
                staff={staffMember}
                roleColors={roleColors[staffMember.role] || roleColors.Mesero}
                onEdit={handleEditStaff}
                onDelete={handleDeleteStaff}
              />
            ))}

            {/* Add New Staff */}
            <button
              onClick={handleAddStaff}
              className="bg-primary-container/10 border-2 border-dashed border-primary-container rounded-xl flex flex-col items-center justify-center p-8 group hover:bg-primary-container/20 cursor-pointer transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">person_add</span>
              </div>
              <span className="font-headline font-black text-primary-container uppercase tracking-tight">Añadir Personal</span>
              <p className="text-xs font-body mt-2 text-primary-container/60">Expandir equipo</p>
            </button>
          </div>
        )}

        {/* Footer Stats */}
        <section className="mt-20 p-8 bg-surface-container-low rounded-2xl flex flex-wrap gap-12 items-center justify-between">
          <div className="flex flex-col">
            <span className="text-4xl font-black font-headline text-primary">{stats.active}</span>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">Personal Activo</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-black font-headline text-secondary-dim">{stats.kitchen}</span>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">Equipo Cocina</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-black font-headline text-tertiary">{stats.front}</span>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">Front of House</span>
          </div>
          <div className="flex flex-col">
            <span className="text-4xl font-black font-headline text-on-surface">{stats.retention}</span>
            <span className="text-xs uppercase tracking-widest font-bold text-neutral-400">Tasa de Retención</span>
          </div>
          <div className="ml-auto">
            <button className="px-6 py-3 bg-inverse-surface text-background font-black rounded-lg uppercase tracking-tight hover:scale-105 transition-transform">
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
          roleColors={roleColors}
        />
      )}

      {/* FAB */}
      <button
        onClick={handleAddStaff}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary rounded-full text-on-primary shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
    </main>
  );
}
