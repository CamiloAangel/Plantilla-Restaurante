'use client';

import Image from 'next/image';
import { Staff } from './StaffSection';

interface StaffCardProps {
  staff: Staff;
  onEdit: (staff: Staff) => void;
  onDelete: (id: string) => void;
}

export default function StaffCard({ staff, onEdit, onDelete }: StaffCardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 transition-all hover:scale-[1.02] relative group">
      {/* Role Badge */}
      <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
        Mesero
      </div>

      {/* Staff Info */}
      <div className="flex flex-col items-center text-center">
        {/* Profile Image */}
        <div className="w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-black/10 group-hover:ring-black/30 transition-all flex items-center justify-center bg-surface-container relative">
          {staff.image ? (
            <Image
              src={staff.image}
              alt={staff.name}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-4xl text-neutral-400">account_circle</span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-2xl font-black font-headline tracking-tight text-on-surface mb-1">{staff.name}</h3>
        <p className="text-primary font-body italic mb-6">Mesero</p>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full mt-4">
          <button
            onClick={() => onEdit(staff)}
            className="flex-1 py-2 bg-surface-container-low hover:bg-blue-100 text-blue-600 font-bold uppercase text-xs rounded-md transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(staff.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>

        {/* Contact */}
        {staff.phone && (
          <p className="text-xs text-neutral-500 mt-2 truncate w-full">{staff.phone}</p>
        )}
      </div>
    </div>
  );
}
