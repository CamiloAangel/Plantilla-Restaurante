'use client';

import { useMemo, useState } from 'react';
import { WAITER_ORDER_STATUSES } from '@/lib/waiter/constants';
import type { CreateOrderInput } from './services/ordersService';
import type { MenuProduct, RestaurantTable, TodayOrderRow } from './types';
import { ORDER_STATUS_LABELS } from './uiConstants';

interface OrderEditorModalProps {
  isOpen: boolean;
  selectedOrder: TodayOrderRow | null;
  tables: RestaurantTable[];
  products: MenuProduct[];
  isLoadingProducts: boolean;
  isSaving: boolean;
  currentWaiterId: string | null;
  onClose: () => void;
  onSubmit: (payload: CreateOrderInput) => Promise<void> | void;
}

interface ItemDraftState {
  quantity: number;
  notes: string;
}

interface ActiveItemView {
  product_id: string;
  product_name: string;
  category: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  notes: string | null;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const toItemDraftMap = (order: TodayOrderRow | null): Record<string, ItemDraftState> => {
  if (!order) {
    return {};
  }

  return order.items.reduce<Record<string, ItemDraftState>>((acc, item) => {
    acc[item.product_id] = {
      quantity: item.quantity,
      notes: item.notes || '',
    };
    return acc;
  }, {});
};

export default function OrderEditorModal({
  isOpen,
  selectedOrder,
  tables,
  products,
  isLoadingProducts,
  isSaving,
  currentWaiterId,
  onClose,
  onSubmit,
}: OrderEditorModalProps) {
  const [tableId, setTableId] = useState(() => selectedOrder?.table_id || '');
  const [itemsByProduct, setItemsByProduct] = useState<Record<string, ItemDraftState>>(
    () => toItemDraftMap(selectedOrder)
  );
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditMode = Boolean(selectedOrder);
  const waiterId = (currentWaiterId || selectedOrder?.waiter_id || '').trim();

  const productMap = useMemo(() => {
    return new Map<string, MenuProduct>(products.map((product) => [product.id, product]));
  }, [products]);

  const selectedOrderItemMap = useMemo(
    () => new Map((selectedOrder?.items || []).map((item) => [item.product_id, item])),
    [selectedOrder]
  );

  const activeItems = useMemo(() => {
    return Object.entries(itemsByProduct)
      .map(([productId, draft]) => ({
        product_id: productId,
        quantity: draft.quantity,
        notes: draft.notes.trim() || null,
      }))
      .filter((item) => item.quantity > 0);
  }, [itemsByProduct]);

  const activeItemsWithMeta = useMemo<ActiveItemView[]>(() => {
    return activeItems.map((item) => {
      const product = productMap.get(item.product_id);
      const selectedOrderItem = selectedOrderItemMap.get(item.product_id);
      const unitPrice = product?.price ?? selectedOrderItem?.unit_price ?? 0;

      return {
        product_id: item.product_id,
        product_name: product?.name || selectedOrderItem?.product_name || 'Producto',
        category: product?.category || 'Sin categoria',
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal: item.quantity * unitPrice,
        notes: item.notes,
      };
    });
  }, [activeItems, productMap, selectedOrderItemMap]);

  const dynamicTotal = useMemo(
    () => activeItemsWithMeta.reduce((sum, item) => sum + item.subtotal, 0),
    [activeItemsWithMeta]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      const byName = product.name.toLowerCase().includes(normalizedSearch);
      const byCategory = product.category.toLowerCase().includes(normalizedSearch);
      return byName || byCategory;
    });
  }, [productSearch, products]);

  const updateItemQuantity = (productId: string, nextQuantity: number) => {
    setItemsByProduct((current) => {
      const currentDraft = current[productId] || { quantity: 0, notes: '' };
      const safeQuantity = Math.max(0, Math.trunc(nextQuantity));

      if (safeQuantity === 0) {
        const clone = { ...current };
        delete clone[productId];
        return clone;
      }

      return {
        ...current,
        [productId]: {
          ...currentDraft,
          quantity: safeQuantity,
        },
      };
    });

    setSuccessMessage(null);
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setItemsByProduct((current) => {
      const currentDraft = current[productId] || { quantity: 1, notes: '' };

      return {
        ...current,
        [productId]: {
          ...currentDraft,
          notes,
        },
      };
    });
  };

  const addProductToOrder = (productId: string) => {
    const product = productMap.get(productId);
    if (!product) {
      return;
    }

    setItemsByProduct((current) => {
      const currentDraft = current[productId] || { quantity: 0, notes: '' };

      return {
        ...current,
        [productId]: {
          ...currentDraft,
          quantity: currentDraft.quantity + 1,
        },
      };
    });

    setValidationError(null);
    setSuccessMessage(`${product.name} agregado al pedido.`);
    setIsProductSelectorOpen(false);
  };

  const removeProductFromOrder = (productId: string) => {
    setItemsByProduct((current) => {
      if (!current[productId]) {
        return current;
      }

      const clone = { ...current };
      delete clone[productId];
      return clone;
    });

    setSuccessMessage('Item removido del pedido.');
  };

  const closeMainModal = () => {
    if (isSaving) {
      return;
    }

    setIsProductSelectorOpen(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!waiterId) {
      setValidationError('No se pudo resolver la ID del mesero. Cierra y vuelve a abrir el modal.');
      return;
    }

    if (activeItemsWithMeta.length === 0) {
      setValidationError('Debes agregar al menos un producto al pedido.');
      return;
    }

    if (activeItemsWithMeta.some((item) => item.quantity <= 0)) {
      setValidationError('Todas las cantidades deben ser mayores a 0.');
      return;
    }

    setValidationError(null);
    setSuccessMessage(null);

    await onSubmit({
      customer_name: waiterId,
      table_id: tableId || null,
      status: WAITER_ORDER_STATUSES.pending,
      items: activeItems,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/55 flex items-center justify-center p-3 md:p-5">
        <div className="w-full max-w-6xl h-[94vh] bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden flex flex-col">
          <header className="px-4 md:px-5 py-3 border-b border-stone-200 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-black uppercase leading-none">
                {isEditMode ? 'Actualizar pedido' : 'Nuevo pedido'}
              </h3>
              <p className="text-xs md:text-sm text-stone-700 font-semibold mt-1">
                Modal CRUD operativo. Estado inicial: {ORDER_STATUS_LABELS[WAITER_ORDER_STATUSES.pending]}.
              </p>
            </div>

            <button
              type="button"
              onClick={closeMainModal}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-black hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
              aria-label="Cerrar modal"
              disabled={isSaving}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>

          <div className="flex-1 min-h-0 p-4 md:p-5">
            <div className="h-full min-h-0 flex flex-col gap-3">
              {validationError && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {validationError}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {successMessage}
                </div>
              )}

              <div className="min-h-0 flex-1 grid grid-cols-1 xl:grid-cols-[1.35fr_0.85fr] gap-4">
                <section className="min-h-0 flex flex-col gap-3">
                  <article className="rounded-xl border border-stone-200 bg-white p-3 md:p-4 space-y-3">
                    <h4 className="text-xs md:text-sm font-black uppercase tracking-wider text-black">Datos base del pedido</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-stone-700 mb-1" htmlFor="order-table-select">
                          Mesa (opcional)
                        </label>
                        <select
                          id="order-table-select"
                          value={tableId}
                          onChange={(event) => setTableId(event.target.value)}
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                          disabled={isSaving}
                        >
                          <option value="">Sin mesa</option>
                          {tables.map((table) => (
                            <option key={table.id} value={table.id}>
                              Mesa {table.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-stone-700 mb-1" htmlFor="order-waiter-id">
                          ID mesero
                        </label>
                        <input
                          id="order-waiter-id"
                          value={waiterId || 'No disponible'}
                          readOnly
                          className="w-full rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-black"
                        />
                      </div>
                    </div>

                    <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800">
                      Estado inicial fijo: {ORDER_STATUS_LABELS[WAITER_ORDER_STATUSES.pending]}
                    </div>
                  </article>

                  <article className="rounded-xl border border-stone-200 bg-white p-3 md:p-4 space-y-3 min-h-0 flex-1 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <h4 className="text-xs md:text-sm font-black uppercase tracking-wider text-black">Items del pedido</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setIsProductSelectorOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-black hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:opacity-60"
                        disabled={isSaving || isLoadingProducts || products.length === 0}
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Agregar producto
                      </button>
                    </div>

                    {isLoadingProducts && (
                      <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        Cargando productos activos...
                      </div>
                    )}

                    {!isLoadingProducts && products.length === 0 && (
                      <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        No hay productos activos disponibles.
                      </div>
                    )}

                    {activeItemsWithMeta.length === 0 ? (
                      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-700">
                        No has agregado productos al pedido.
                      </div>
                    ) : (
                      <div className="space-y-2 overflow-y-auto pr-1 min-h-0">
                        {activeItemsWithMeta.map((item) => {
                          const draft = itemsByProduct[item.product_id] || { quantity: 0, notes: '' };

                          return (
                            <article key={item.product_id} className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-black">
                                    <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
                                  </div>

                                  <div>
                                    <p className="text-sm font-black text-black">{item.product_name}</p>
                                    <p className="text-xs font-semibold text-stone-700">
                                      {item.category} · {formatCurrency(item.unit_price)}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeProductFromOrder(item.product_id)}
                                  className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60"
                                  disabled={isSaving}
                                >
                                  Eliminar
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(item.product_id, draft.quantity - 1)}
                                    className="h-9 w-9 rounded-lg border border-stone-300 bg-white text-black font-black hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:opacity-60"
                                    disabled={isSaving}
                                  >
                                    -
                                  </button>
                                  <span className="inline-flex min-w-10 justify-center rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm font-black text-black">
                                    {draft.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(item.product_id, draft.quantity + 1)}
                                    className="h-9 w-9 rounded-lg bg-orange-500 text-white font-black hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"
                                    disabled={isSaving}
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="md:col-span-2 flex items-center md:justify-end">
                                  <p className="text-sm font-black text-black">
                                    Subtotal: {formatCurrency(item.subtotal)}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-700 mb-1" htmlFor={`note-${item.product_id}`}>
                                  Descripcion del item
                                </label>
                                <input
                                  id={`note-${item.product_id}`}
                                  value={draft.notes}
                                  onChange={(event) => updateItemNotes(item.product_id, event.target.value)}
                                  placeholder="Ej: sin cebolla"
                                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                                  disabled={isSaving}
                                />
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </article>
                </section>

                <aside className="min-h-0">
                  <article className="rounded-xl border border-stone-200 bg-white p-3 md:p-4 space-y-3 h-full min-h-0 flex flex-col">
                    <div>
                      <h4 className="text-xs md:text-sm font-black uppercase tracking-wider text-black">Resumen final del pedido</h4>
                      <p className="text-xs text-stone-700">
                        Se muestran todos los productos y descripciones sin truncar.
                      </p>
                    </div>

                    {activeItemsWithMeta.length === 0 ? (
                      <p className="text-sm text-stone-700">Aun no hay productos en el pedido.</p>
                    ) : (
                      <div className="space-y-2 overflow-y-auto pr-1 min-h-0 flex-1">
                        {activeItemsWithMeta.map((item) => (
                          <div key={`summary-${item.product_id}`} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 space-y-1">
                            <p className="text-sm font-black text-black">
                              {item.quantity}x {item.product_name}
                            </p>
                            <p className="text-xs text-stone-700">{item.category}</p>
                            <p className="text-xs font-semibold text-black">Subtotal: {formatCurrency(item.subtotal)}</p>
                            {item.notes && (
                              <p className="text-xs text-stone-700 whitespace-normal break-words">
                                Observacion: {item.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-lg border border-stone-200 bg-white p-3 space-y-1">
                      <p className="text-xs uppercase tracking-wider font-black text-stone-700">Mesa seleccionada</p>
                      <p className="text-sm font-black text-black">{tableId ? `Mesa asignada` : 'Sin mesa'}</p>
                    </div>

                    <div className="rounded-lg border border-stone-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wider font-black text-stone-700">Total del pedido</p>
                      <p className="text-2xl font-black text-black">{formatCurrency(dynamicTotal)}</p>
                    </div>
                  </article>
                </aside>
              </div>
            </div>
          </div>

          <footer className="px-4 md:px-5 py-3 border-t border-stone-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 bg-white">
            <button
              type="button"
              onClick={closeMainModal}
              className="inline-flex items-center justify-center rounded-lg bg-yellow-300 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-black hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:opacity-60"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isSaving || isLoadingProducts}
              className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"
            >
              {isSaving
                ? (isEditMode ? 'Actualizando...' : 'Creando...')
                : (isEditMode ? 'Actualizar pedido' : 'Crear pedido')}
            </button>
          </footer>
        </div>
      </div>

      {isProductSelectorOpen && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-3 md:p-5">
          <div className="w-full max-w-3xl rounded-2xl border border-stone-200 bg-white shadow-xl max-h-[82vh] overflow-hidden">
            <header className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
              <div>
                <h5 className="text-lg font-black uppercase tracking-tight text-black">Seleccionar producto</h5>
                <p className="text-xs font-semibold text-stone-700">Paleta clara naranja-amarillo para seleccion rapida.</p>
              </div>

              <button
                type="button"
                onClick={() => setIsProductSelectorOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-black hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label="Cerrar selector de productos"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </header>

            <div className="p-4 md:p-5 space-y-3 overflow-y-auto max-h-[calc(82vh-74px)]">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-stone-700 mb-1" htmlFor="product-search">
                  Buscar producto
                </label>
                <input
                  id="product-search"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Nombre o categoria"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                />
              </div>

              {filteredProducts.length === 0 ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                  No se encontraron productos para este filtro.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredProducts.map((product) => (
                    <article key={product.id} className="rounded-lg border border-stone-200 bg-white px-3 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-black">
                          <span className="material-symbols-outlined text-[18px]">lunch_dining</span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-black">{product.name}</p>
                          <p className="text-xs text-stone-700">{product.category}</p>
                          <p className="text-xs font-semibold text-black">{formatCurrency(product.price)}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addProductToOrder(product.id)}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60"
                      >
                        Agregar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
