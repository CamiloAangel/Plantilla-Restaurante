import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/adminApi";

interface ProductRecord {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string | null;
  active: boolean;
  stock: number;
  created_at: string;
  updated_at: string;
  admin_id: string;
}

interface ProductApiError {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
}

interface CreateProductInput {
  name: string;
  price: number;
  description: string;
  category: string;
  image_url: string | null;
  active: boolean;
  stock: number;
}

const sanitizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const sanitizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseCreateProductInput = (payload: unknown): { data?: CreateProductInput; error?: string } => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload inválido." };
  }

  const body = payload as Record<string, unknown>;
  const name = sanitizeString(body.name);
  const description = sanitizeString(body.description);
  const category = sanitizeString(body.category);
  const price = parseNumber(body.price);
  const stockValue = parseNumber(body.stock);
  const active = typeof body.active === "boolean" ? body.active : true;

  if (!name || !description || !category) {
    return { error: "Nombre, descripción y categoría son obligatorios." };
  }

  if (price === null || price <= 0) {
    return { error: "El precio debe ser mayor a 0." };
  }

  if (stockValue !== null && stockValue < 0) {
    return { error: "El stock no puede ser negativo." };
  }

  return {
    data: {
      name,
      description,
      category,
      price,
      image_url: sanitizeOptionalString(body.image_url),
      active,
      stock: stockValue === null ? 0 : Math.trunc(stockValue),
    },
  };
};

const getPublicProductsLoadError = (error: ProductApiError): string => {
  if (process.env.NODE_ENV === "production") {
    return "No se pudieron cargar los productos.";
  }

  const debugParts = [error.message, error.details || "", error.hint || ""].filter(Boolean);
  return `No se pudieron cargar los productos. ${debugParts.join(" | ")}`;
};

export async function GET() {
  const adminContext = await getAdminRequestContext();

  if (!adminContext.ok) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  const { data, error } = await adminContext.adminClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products in admin API:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { error: getPublicProductsLoadError(error) },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: (data || []) as ProductRecord[] });
}

export async function POST(request: Request) {
  const adminContext = await getAdminRequestContext();

  if (!adminContext.ok) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en el body." }, { status: 400 });
  }

  const parsed = parseCreateProductInput(requestBody);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error || "Payload inválido." }, { status: 400 });
  }

  const nowISO = new Date().toISOString();

  const { data, error } = await adminContext.adminClient
    .from("products")
    .insert([
      {
        ...parsed.data,
        admin_id: adminContext.userId,
        created_at: nowISO,
        updated_at: nowISO,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("Error creating product in admin API:", error);
    return NextResponse.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }

  return NextResponse.json({ data: data as ProductRecord }, { status: 201 });
}
