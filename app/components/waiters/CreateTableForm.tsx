import type { FormEvent } from 'react';

interface CreateTableFormProps {
  tableLabelInput: string;
  tableCapacityInput: number;
  isCreatingTable: boolean;
  onTableLabelChange: (value: string) => void;
  onTableCapacityChange: (value: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function CreateTableForm({
  tableLabelInput,
  tableCapacityInput,
  isCreatingTable,
  onTableLabelChange,
  onTableCapacityChange,
  onSubmit,
}: CreateTableFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-end gap-3"
    >
      <div className="flex-1">
        <label className="block text-[11px] uppercase tracking-wider font-black text-stone-500 mb-1" htmlFor="new-table-label">
          Nombre de mesa
        </label>
        <input
          id="new-table-label"
          type="text"
          value={tableLabelInput}
          onChange={(event) => onTableLabelChange(event.target.value)}
          placeholder="Ej: 09"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <div className="w-full md:w-32">
        <label className="block text-[11px] uppercase tracking-wider font-black text-stone-500 mb-1" htmlFor="new-table-capacity">
          Capacidad
        </label>
        <input
          id="new-table-capacity"
          type="number"
          min={1}
          max={20}
          value={tableCapacityInput}
          onChange={(event) => onTableCapacityChange(Number(event.target.value) || 1)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <button
        type="submit"
        disabled={isCreatingTable}
        className="h-10 px-4 rounded-lg bg-stone-900 text-white font-black uppercase text-xs tracking-widest hover:bg-black transition-colors disabled:opacity-60"
      >
        {isCreatingTable ? 'Creando...' : 'Crear Mesa'}
      </button>
    </form>
  );
}