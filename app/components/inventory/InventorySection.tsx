'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createProduct,
  deleteProduct,
  getProducts,
  toggleProductStatus,
  updateProduct,
  type Product,
  type UpdateProductInput,
} from '@/lib/supabaseProducts';
import { AlertMessage } from './AlertMessage';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ProductCard } from './ProductCard';
import { ProductFormModal, type ProductFormSubmitData } from './ProductFormModal';

interface AlertState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

type FilterStatus = 'all' | 'active' | 'inactive';

const DEFAULT_CATEGORIES = [
  'Hamburguesas',
  'Perros',
  'Salchipapas',
  'Picadas',
  'Pizzas',
  'Lasañas',
  'Entradas',
  'Jugos',
  'Otros',
];

export function InventorySection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [alert, setAlert] = useState<AlertState>({ visible: false, message: '', type: 'info' });

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const showAlert = (type: AlertState['type'], message: string) => {
    setAlert({ visible: true, type, message });
  };

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const allProducts = await getProducts();
      setProducts(allProducts || []);
    } catch (error) {
      console.error('Error loading products:', error);
      showAlert('error', 'No se pudieron cargar los productos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categoryOptions = useMemo(() => {
    const dbCategories = products.map((product) => product.category).filter(Boolean);
    const uniqueCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories]));
    return uniqueCategories.sort((a, b) => a.localeCompare(b, 'es'));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (statusFilter === 'active') result = result.filter((product) => product.active);
    if (statusFilter === 'inactive') result = result.filter((product) => !product.active);

    if (categoryFilter !== 'all') {
      result = result.filter((product) => product.category === categoryFilter);
    }

    return result;
  }, [products, statusFilter, categoryFilter]);

  const activeCount = products.filter((product) => product.active).length;
  const inactiveCount = products.length - activeCount;

  const openCreateModal = () => {
    setProductToEdit(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setProductToEdit(product);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setProductToEdit(null);
  };

  const handleSaveProduct = async (data: ProductFormSubmitData) => {
    const trimmedName = data.name.trim();
    const trimmedDescription = data.description.trim();
    const trimmedCategory = data.category.trim();
    const numericPrice = Number(data.price);

    if (!trimmedName || !trimmedDescription || !trimmedCategory) {
      showAlert('error', 'Completa todos los campos obligatorios.');
      return;
    }

    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      showAlert('error', 'El precio debe ser un número mayor a 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!productToEdit) {
        const createdProduct = await createProduct(
          {
            name: trimmedName,
            price: numericPrice,
            description: trimmedDescription,
            category: trimmedCategory,
            active: data.active,
            stock: 0,
          },
          data.imageFile || undefined
        );

        if (!createdProduct) {
          showAlert('error', 'No se pudo crear el producto.');
          return;
        }

        showAlert('success', 'Producto agregado correctamente.');
      } else {
        const updates: UpdateProductInput = {
          name: trimmedName,
          price: numericPrice,
          description: trimmedDescription,
          category: trimmedCategory,
          active: data.active,
        };

        const updatedProduct = await updateProduct(
          productToEdit.id,
          updates,
          data.imageFile || undefined
        );

        if (!updatedProduct) {
          showAlert('error', 'No se pudo actualizar el producto.');
          return;
        }

        showAlert('success', 'Producto actualizado correctamente.');
      }

      closeFormModal();
      await loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      showAlert('error', 'Ocurrió un error al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setProductToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const wasDeleted = await deleteProduct(productToDelete.id);

      if (!wasDeleted) {
        showAlert('error', 'No se pudo eliminar el producto.');
        return;
      }

      showAlert('success', `Producto "${productToDelete.name}" eliminado correctamente.`);
      closeDeleteModal();
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showAlert('error', 'Ocurrió un error al eliminar el producto.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    setStatusUpdatingId(product.id);
    try {
      const updatedProduct = await toggleProductStatus(product.id, product.active);

      if (!updatedProduct) {
        showAlert('error', `No se pudo cambiar el estado de ${product.name}.`);
        return;
      }

      setProducts((currentProducts) =>
        currentProducts.map((item) => (item.id === updatedProduct.id ? updatedProduct : item))
      );

      showAlert(
        'success',
        `${updatedProduct.name} está ${updatedProduct.active ? 'activo' : 'inactivo'}.`
      );
    } catch (error) {
      console.error('Error toggling product status:', error);
      showAlert('error', `No se pudo actualizar el estado de ${product.name}.`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <main className="ml-64 w-[calc(100%-16rem)] min-h-screen bg-stone-50 pt-8">
        <div className="pl-8 pr-8 pb-12 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <p className="text-black font-headline text-lg font-bold">Cargando inventario...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-64 w-[calc(100%-16rem)] min-h-screen bg-stone-50">
      <div className="pt-8 pl-8 pr-8 pb-12">
        <AlertMessage
          message={alert.message}
          type={alert.type}
          isVisible={alert.visible}
          onClose={() => setAlert((current) => ({ ...current, visible: false }))}
        />

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="relative">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-black leading-none">
                Inventario <br /> <span className="text-orange-600 italic pr-2">ACTUAL</span>
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={openCreateModal}
                className="bg-yellow-400 text-black px-5 py-2.5 rounded-lg font-black uppercase tracking-tight flex items-center gap-2 hover:bg-yellow-500 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg border border-yellow-500 text-sm"
              >
                <span className="material-symbols-outlined font-black text-lg">add</span>
                Agregar Producto
              </button>
            </div>
          </div>

          <section className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-black text-white'
                    : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                Activos ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                  statusFilter === 'inactive'
                    ? 'bg-stone-700 text-white'
                    : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-100'
                }`}
              >
                Inactivos ({inactiveCount})
              </button>
            </div>

            <div className="hidden sm:block h-6 w-px bg-stone-300 mx-2"></div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pr-10 pl-4 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 outline-none cursor-pointer shadow-sm transition-colors"
              >
                <option value="all">Todas las Categorías</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none text-lg">
                expand_more
              </span>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onToggleStatus={(item) => void handleToggleStatus(item)}
                isStatusUpdating={statusUpdatingId === product.id}
              />
            ))}

            {filteredProducts.length > 0 && (
              <div
                onClick={openCreateModal}
                className="group border-4 border-dashed border-stone-200 rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-50 relative cursor-pointer min-h-[400px]"
              >
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mb-6 group-hover:bg-yellow-400 transition-colors">
                    <span className="material-symbols-outlined text-4xl text-stone-400 group-hover:text-black font-black">
                      add
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tighter text-black uppercase mb-2">Añadir Nuevo</h3>
                  <p className="text-sm text-black opacity-60 font-medium">
                    Actualiza tu menú con nuevas adiciones
                  </p>
                </div>
              </div>
            )}
          </div>

          {filteredProducts.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-xl border border-stone-200 w-full">
              <span className="material-symbols-outlined text-7xl text-stone-300 mb-4">inventory_2</span>
              <h3 className="text-2xl font-black text-black mb-2">No hay productos</h3>
              <p className="text-black opacity-60 font-medium mb-6">
                No encontramos productos para estos filtros.
              </p>
              <button
                onClick={openCreateModal}
                className="bg-yellow-400 text-black px-5 py-2.5 rounded-lg font-black uppercase tracking-tight flex items-center gap-2 hover:bg-yellow-500 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg border border-yellow-500 text-sm"
              >
                <span className="material-symbols-outlined font-black text-lg">add</span>
                Agregar Producto
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <div className="bg-stone-900 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border-l-[3px] border-yellow-400">
          <span
            className="material-symbols-outlined text-yellow-400 text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-0.5">
              Catálogo
            </p>
            <p className="text-base font-black tracking-tighter">{activeCount} ACTIVOS</p>
          </div>
        </div>
      </div>

      {isFormModalOpen && (
        <ProductFormModal
          key={productToEdit?.id || 'create'}
          isOpen={isFormModalOpen}
          onClose={closeFormModal}
          onSubmit={handleSaveProduct}
          initialData={productToEdit}
          categoryOptions={categoryOptions}
          isSubmitting={isSubmitting}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen && !!productToDelete}
        onConfirm={() => void confirmDeleteProduct()}
        onCancel={closeDeleteModal}
        productName={productToDelete?.name || ''}
        isDeleting={isDeleting}
      />
    </main>
  );
}

export default InventorySection;