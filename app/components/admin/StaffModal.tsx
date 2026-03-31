'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Staff } from './StaffSection';

interface StaffModalProps {
  staff: Staff | null;
  onClose: () => void;
  onSave: (staff: Omit<Staff, 'id'>) => void;
  roleColors: Record<string, { badge: string; ring: string; icon: string }>;
}

const roles = ['Dueño', 'Cocinero', 'Mesero'];

export default function StaffModal({ staff, onClose, onSave, roleColors }: StaffModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Mesero',
    position: '',
    email: '',
    phone: '',
    image: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        role: staff.role,
        position: staff.position,
        email: staff.email || '',
        phone: staff.phone || '',
        image: staff.image || '',
      });
      setImagePreview(staff.image || null);
    }
  }, [staff]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `staff/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('staff-images').getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image: data.publicUrl }));
      setImagePreview(data.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.position) {
      alert('Por favor completa el nombre y posición');
      return;
    }

    onSave({
      name: formData.name,
      role: formData.role,
      position: formData.position,
      email: formData.email,
      phone: formData.phone,
      image: formData.image || null,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary-container p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-black font-headline text-white">
            {staff ? 'Editar Personal' : 'Añadir Personal'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:scale-110 transition-transform"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-surface-container flex items-center justify-center ring-4 ring-primary/20">
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-neutral-400">account_circle</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-sm uppercase transition-colors hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Subiendo...' : 'Subir Foto'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">Nombre*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ej: Juan García"
              className="w-full px-4 py-2 border-2 border-surface-variant rounded-lg focus:border-primary outline-none transition-colors"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">Rol*</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border-2 border-surface-variant rounded-lg focus:border-primary outline-none transition-colors"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">Posición*</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              placeholder="Ej: Chef Principal"
              className="w-full px-4 py-2 border-2 border-surface-variant rounded-lg focus:border-primary outline-none transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-2 border-2 border-surface-variant rounded-lg focus:border-primary outline-none transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+1 23 4567 8900"
              className="w-full px-4 py-2 border-2 border-surface-variant rounded-lg focus:border-primary outline-none transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border-2 border-surface-variant text-on-surface rounded-lg font-bold uppercase hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary text-on-primary rounded-lg font-bold uppercase hover:brightness-110 transition-colors disabled:opacity-50"
            >
              {staff ? 'Actualizar' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
