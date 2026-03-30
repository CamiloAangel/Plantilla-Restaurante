'use client';

import { useEffect, useState } from 'react';
import { type Product } from '@/lib/supabaseProducts';

interface ProductFormState {
  name: string;
  price: string;
  category: string;
  description: string;
  active: boolean;
}

export interface ProductFormSubmitData {
  name: string;
  price: string;
  category: string;
  description: string;
  active: boolean;
  imageFile: File | null;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormSubmitData) => Promise<void> | void;
  initialData: Product | null;
  categoryOptions: string[];
  isSubmitting: boolean;
}

const getInitialFormState = (initialData: Product | null, fallbackCategory: string): ProductFormState => ({
  name: initialData?.name || '',
  price: initialData ? String(initialData.price) : '',
  category: initialData?.category || fallbackCategory,
  description: initialData?.description || '',
  active: initialData?.active ?? true,
});

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categoryOptions,
  isSubmitting,
}: ProductFormModalProps) {
  const fallbackCategory = categoryOptions[0] || 'Otros';
  const [formData, setFormData] = useState<ProductFormState>(() =>
    getInitialFormState(initialData, fallbackCategory)
  );
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(() => initialData?.image_url || null);
  const [temporaryPreviewUrl, setTemporaryPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (temporaryPreviewUrl) {
        URL.revokeObjectURL(temporaryPreviewUrl);
      }
    };
  }, [temporaryPreviewUrl]);

  if (!isOpen) return null;

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    if (name === 'active') {
      const input = event.target as HTMLInputElement;
      setFormData((current) => ({ ...current, active: input.checked }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (temporaryPreviewUrl) {
      URL.revokeObjectURL(temporaryPreviewUrl);
      setTemporaryPreviewUrl(null);
    }

    setSelectedImageFile(file);

    if (!file) {
      setImagePreview(initialData?.image_url || null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setTemporaryPreviewUrl(previewUrl);
    setImagePreview(previewUrl);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      ...formData,
      imageFile: selectedImageFile,
    });
  };

  const isEditMode = Boolean(initialData);

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-xl font-black text-black tracking-tight uppercase">
            {isEditMode ? 'Editar Producto' : 'Agregar Producto'}
          </h3>
          <button onClick={onClose} className="text-stone-500 hover:text-black">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-stone-600 block mb-1">
                Nombre
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-black"
                placeholder="Ej: Hamburguesa Clásica"
                required
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-stone-600 block mb-1">
                Precio
              </label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-black"
                placeholder="Ej: 22.900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-stone-600 block mb-1">
                Categoría
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-black"
                required
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="active"
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-stone-300"
              />
              <label htmlFor="active" className="text-sm font-bold text-stone-700">
                Producto activo
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-wider text-stone-600 block mb-1">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-black resize-none"
              placeholder="Describe el producto..."
              required
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-wider text-stone-600 block mb-1">
              Imagen
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-black file:mr-3 file:border-0 file:bg-yellow-400 file:px-3 file:py-1 file:rounded-md file:font-black file:text-black"
            />
            {imagePreview && (
              <div className="mt-3">
                <p className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">Vista previa</p>
                <img
                  src={imagePreview}
                  alt="Vista previa del producto"
                  className="h-32 w-full max-w-xs object-cover rounded-lg border border-stone-200"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 font-bold text-sm hover:bg-stone-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-yellow-400 border border-yellow-500 text-black font-black text-sm hover:bg-yellow-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Agregar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductFormModal;
