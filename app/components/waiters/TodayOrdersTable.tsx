import {
  WAITER_ORDER_STATUSES,
  type WaiterOrderStatus,
} from '@/lib/waiter/constants';
import { ORDER_STATUS_LABELS } from './uiConstants';
import type { TodayOrderRow } from './types';

interface TodayOrdersTableProps {
  rows: TodayOrderRow[];
  busyOrderId: string | null;
  onChangeStatus: (order: TodayOrderRow, status: WaiterOrderStatus) => void;
  onEditOrder: (order: TodayOrderRow) => void;
}

const formatClock = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '--:--';
  }

  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const getStatusLabel = (status: string): string => {
  const normalized = status as keyof typeof ORDER_STATUS_LABELS;
  return ORDER_STATUS_LABELS[normalized] || status;
};

export default function TodayOrdersTable({
  rows,
  busyOrderId,
  onChangeStatus,
  onEditOrder,
}: TodayOrdersTableProps) {
  const statusOptions: WaiterOrderStatus[] = [
    WAITER_ORDER_STATUSES.pending,
    WAITER_ORDER_STATUSES.inPreparation,
    WAITER_ORDER_STATUSES.delivered,
  ];

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <p className="text-sm font-semibold text-stone-500">No hay pedidos registrados hoy.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-stone-100 text-stone-700 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-3 py-3 text-left w-[72px]">Hora</th>
              <th className="px-3 py-3 text-left w-[110px] hidden xl:table-cell">Pedido</th>
              <th className="px-4 py-3 text-left">Cliente / Mesa</th>
              <th className="px-3 py-3 text-left">Productos</th>
              <th className="px-3 py-3 text-left w-[96px]">Estado</th>
              <th className="px-3 py-3 text-left w-[110px]">Total</th>
              <th className="px-3 py-3 text-left w-[190px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={row.is_current_waiter
                  ? 'bg-orange-50 border-l-4 border-orange-500'
                  : 'bg-white border-b border-stone-100'}
              >
                <td className="px-3 py-3 font-semibold text-stone-700">{formatClock(row.created_at)}</td>
                <td className="px-3 py-3 font-mono text-xs text-stone-700 hidden xl:table-cell">#{row.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-stone-900">{row.display_target}</div>
                  {row.is_current_waiter && (
                    <span className="inline-flex mt-1 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                      Mi pedido
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-stone-700">
                  {row.items.length === 0 ? (
                    <p className="text-xs text-stone-500">Sin productos</p>
                  ) : (
                    <div className="space-y-1">
                      {row.items.map((item, index) => (
                        <p key={`${row.id}-${item.product_id}-${index}`} className="text-xs text-stone-800 whitespace-normal break-words">
                          <span className="font-black">{item.quantity}x</span> {item.product_name}
                          <span className="font-semibold"> ({formatCurrency(item.subtotal)})</span>
                          {item.notes ? ` - ${item.notes}` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full bg-stone-200 text-stone-700 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
                    {getStatusLabel(row.status)}
                  </span>
                </td>
                <td className="px-3 py-3 font-black text-stone-900">{formatCurrency(row.total_amount)}</td>
                <td className="px-3 py-3">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500" htmlFor={`order-status-${row.id}`}>
                        Estado
                      </label>
                      <div className="relative">
                        <select
                          id={`order-status-${row.id}`}
                          value={statusOptions.includes(row.status as WaiterOrderStatus)
                            ? row.status as WaiterOrderStatus
                            : ''}
                          onChange={(event) => {
                            const nextStatus = event.target.value as WaiterOrderStatus;
                            if (!statusOptions.includes(nextStatus)) {
                              return;
                            }

                            void onChangeStatus(row, nextStatus);
                          }}
                          disabled={busyOrderId === row.id}
                          className="w-full appearance-none rounded-md border border-stone-300 bg-white px-3 py-2 pr-8 text-[11px] font-bold uppercase tracking-wider text-stone-800 outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60"
                        >
                          {!statusOptions.includes(row.status as WaiterOrderStatus) && (
                            <option value="" disabled>
                              {`Actual: ${getStatusLabel(row.status)}`}
                            </option>
                          )}
                          {statusOptions.map((statusValue) => (
                            <option key={`${row.id}-${statusValue}`} value={statusValue}>
                              {getStatusLabel(statusValue)}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 text-[18px]">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEditOrder(row)}
                      disabled={busyOrderId === row.id}
                      className="rounded-md bg-yellow-300 hover:bg-yellow-400 border border-yellow-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:opacity-60"
                    >
                      Editar pedido
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}