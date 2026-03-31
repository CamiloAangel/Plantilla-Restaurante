import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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

interface UpdateProductInput {
  name?: string;
  price?: number;
  description?: string;
  category?: string;
  image_url?: string | null;
  active?: boolean;
  stock?: number;
  updated_at?: string;
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

const parseUpdateProductInput = (payload: unknown): { data?: UpdateProductInput; error?: string } => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload inválido." };
  }

  const body = payload as Record<string, unknown>;
  const updates: UpdateProductInput = {};

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = sanitizeString(body.name);
    if (!name) {
      return { error: "El nombre no puede estar vacío." };
    }
    updates.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const description = sanitizeString(body.description);
    if (!description) {
      return { error: "La descripción no puede estar vacía." };
    }
    updates.description = description;
  }

  if (Object.prototype.hasOwnProperty.call(body, "category")) {
    const category = sanitizeString(body.category);
    if (!category) {
      return { error: "La categoría no puede estar vacía." };
    }
    updates.category = category;
  }

  if (Object.prototype.hasOwnProperty.call(body, "price")) {
    const price = parseNumber(body.price);
    if (price === null || price <= 0) {
      return { error: "El precio debe ser mayor a 0." };
    }
    updates.price = price;
  }

  if (Object.prototype.hasOwnProperty.call(body, "stock")) {
    const stockValue = parseNumber(body.stock);
    if (stockValue === null || stockValue < 0) {
      return { error: "El stock no puede ser negativo." };
    }

    updates.stock = Math.trunc(stockValue);
  }

  if (Object.prototype.hasOwnProperty.call(body, "active")) {
    if (typeof body.active !== "boolean") {
      return { error: "El estado activo es inválido." };
    }

    updates.active = body.active;
  }

  if (Object.prototype.hasOwnProperty.call(body, "image_url")) {
    updates.image_url = sanitizeOptionalString(body.image_url);
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No se recibieron campos para actualizar." };
  }

  updates.updated_at = new Date().toISOString();

  return { data: updates };
};

const removeProductImageIfNeeded = async (
  adminClient: SupabaseClient,
  imageUrl?: string | null
) => {
  if (!imageUrl) {
    return;
  }

  const pathMatch = imageUrl.match(/storage\/v1\/object\/public\/product-images\/(.+)$/);

  if (!pathMatch) {
    return;
  }

  const imagePath = decodeURIComponent(pathMatch[1]);
  await adminClient.storage.from("product-images").remove([imagePath]);
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Id de producto inválido." }, { status: 400 });
  }

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

  const parsed = parseUpdateProductInput(requestBody);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error || "Payload inválido." }, { status: 400 });
  }

  const { data, error } = await adminContext.adminClient
    .from("products")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating product in admin API:", error);
    return NextResponse.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  }

  return NextResponse.json({ data: data as ProductRecord });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Id de producto inválido." }, { status: 400 });
  }

  const adminContext = await getAdminRequestContext();

  if (!adminContext.ok) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  const { data: product, error: getProductError } = await adminContext.adminClient
    .from("products")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  if (getProductError) {
    console.error("Error loading product before delete in admin API:", getProductError);
  }

  const { error } = await adminContext.adminClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting product in admin API:", error);
    return NextResponse.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  }

  try {
    await removeProductImageIfNeeded(adminContext.adminClient, product?.image_url);
  } catch (storageError) {
    console.error("Error deleting product image in storage:", storageError);
  }

  return NextResponse.json({ success: true });
}
