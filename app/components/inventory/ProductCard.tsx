import { type Product } from '@/lib/supabaseProducts';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  isStatusUpdating?: boolean;
}

export function ProductCard({
  product,
  onEdit,
  onDelete,
  onToggleStatus,
  isStatusUpdating = false,
}: ProductCardProps) {
  return (
    <div
      className={`group bg-white rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl border border-stone-200 relative ${
        !product.active ? 'opacity-80 grayscale-[25%]' : ''
      }`}
    >
      <div className="h-64 overflow-hidden relative">
        <img
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          src={product.image_url || 'https://via.placeholder.com/400x300?text=Sin+Imagen'}
        />

        <button
          onClick={() => onToggleStatus(product)}
          disabled={isStatusUpdating}
          className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border transition-colors shadow-sm disabled:opacity-60 ${
            product.active
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
              : 'bg-stone-200 text-stone-700 border-stone-300 hover:bg-stone-300'
          }`}
        >
          {isStatusUpdating ? 'Guardando...' : product.active ? 'Activo' : 'Inactivo'}
        </button>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <h3 className="text-2xl font-black tracking-tighter text-black uppercase mb-1">{product.name}</h3>
          <p className="text-sm text-black font-medium opacity-70 line-clamp-2">{product.description}</p>
        </div>

        <div className="mt-auto">
          <div className="pt-6 pb-6 border-t border-b border-stone-100 mb-4 py-3">
            <div className="flex justify-between items-center">
              <span className="text-black text-xs font-black uppercase tracking-widest opacity-60">Categoría</span>
              <span className="text-black font-black">{product.category}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-black text-xs font-black uppercase tracking-widest opacity-60">Precio</span>
              <span className="text-black font-black text-lg">${product.price.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onEdit(product)}
              className="flex-grow flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-blue-100 text-blue-800 font-black hover:bg-blue-200 transition-colors uppercase text-sm tracking-tighter border border-blue-200"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar
            </button>
            <button
              onClick={() => onDelete(product)}
              className="flex-grow flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-red-100 text-red-800 font-black hover:bg-red-200 transition-colors uppercase text-sm tracking-tighter border border-red-200"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
