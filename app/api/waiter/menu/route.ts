import { NextResponse } from 'next/server';
import { getWaiterRequestContext } from '@/lib/auth/waiterApi';

const PRODUCTS_TABLE = 'products';

interface ProductRecord {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string | null;
  active: boolean;
  stock: number;
}

interface ApiLikeError {
  code?: string;
  message: string;
  details?: string | null;
}

const isMissingSchemaError = (error: ApiLikeError | null): boolean => {
  if (!error) {
    return false;
  }

  const searchableMessage = `${error.message} ${error.details || ''}`.toLowerCase();
  return (
    error.code === 'PGRST205'
    || searchableMessage.includes('could not find the table')
    || searchableMessage.includes(PRODUCTS_TABLE)
  );
};

export async function GET() {
  const waiterContext = await getWaiterRequestContext();

  if (!waiterContext.ok) {
    return NextResponse.json({ error: waiterContext.error }, { status: waiterContext.status });
  }

  const { data, error } = await waiterContext.serviceClient
    .from(PRODUCTS_TABLE)
    .select('id, name, price, description, category, image_url, active, stock')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) {
      return NextResponse.json(
        { error: 'No se encontro la tabla de productos. Verifica el esquema de inventario.' },
        { status: 500 }
      );
    }

    console.error('Error loading waiter menu products:', error);
    return NextResponse.json({ error: 'No se pudo cargar el menu activo.' }, { status: 500 });
  }

  return NextResponse.json({ data: (data || []) as ProductRecord[] });
}