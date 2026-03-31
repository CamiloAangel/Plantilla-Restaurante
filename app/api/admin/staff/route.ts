import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminRequestContext } from "@/lib/auth/adminApi";

const STAFF_ROLE = "Mesero";
const staffSelectColumns = "id, name, role, position, image, email, phone";

interface StaffApiError {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
}

interface AuthUserRecord {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

interface StaffRecord {
  id: string;
  name: string;
  role: string;
  position: string;
  image: string | null;
  email: string | null;
  phone: string | null;
}

interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  image: string | null;
  phone: string | null;
}

const isMissingCreatedAtError = (error: StaffApiError | null): boolean => {
  if (!error) {
    return false;
  }

  const searchableMessage = `${error.message} ${error.details || ""}`.toLowerCase();
  return error.code === "42703" && searchableMessage.includes("created_at");
};

const isMissingStaffTableError = (error: StaffApiError | null): boolean => {
  if (!error) {
    return false;
  }

  const searchableMessage = `${error.message} ${error.details || ""}`.toLowerCase();
  return (
    error.code === "PGRST205" ||
    (searchableMessage.includes("could not find the table") && searchableMessage.includes("public.staff"))
  );
};

const getPublicStaffLoadError = (error: StaffApiError): string => {
  if (process.env.NODE_ENV === "production") {
    return "No se pudo cargar el personal.";
  }

  const debugParts = [error.message, error.details || "", error.hint || ""].filter(Boolean);
  return `No se pudo cargar el personal. ${debugParts.join(" | ")}`;
};

const sanitizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const sanitizeEmail = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const sanitizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const mapAuthUserToStaffRecord = (user: AuthUserRecord): StaffRecord => {
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;
  const metadataName = typeof metadata.name === "string" ? metadata.name.trim() : "";
  const metadataPhone = typeof metadata.phone === "string" ? metadata.phone.trim() : "";
  const metadataImage = typeof metadata.image === "string" ? metadata.image.trim() : "";
  const fallbackName = user.email?.split("@")[0] || "Mesero";

  return {
    id: user.id,
    name: metadataName || fallbackName,
    role: STAFF_ROLE,
    position: STAFF_ROLE,
    image: metadataImage || null,
    email: user.email || null,
    phone: metadataPhone || user.phone || null,
  };
};

const getMeseroUsersFromAuth = async (
  adminClient: SupabaseClient
): Promise<{ data: StaffRecord[]; error: StaffApiError | null }> => {
  const { data: authUsersData, error: authUsersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersError) {
    return {
      data: [],
      error: {
        message: authUsersError.message,
      },
    };
  }

  const users = ((authUsersData as { users?: AuthUserRecord[] } | null)?.users || []) as AuthUserRecord[];
  const meseros = users
    .filter((user) => {
      const metadata = (user.user_metadata || {}) as Record<string, unknown>;
      return metadata.role === STAFF_ROLE;
    })
    .map(mapAuthUserToStaffRecord);

  return {
    data: meseros,
    error: null,
  };
};

const parseCreateStaffInput = (payload: unknown): { data?: CreateStaffInput; error?: string } => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload inválido." };
  }

  const body = payload as Record<string, unknown>;
  const name = sanitizeString(body.name);
  const email = sanitizeEmail(body.email);
  const password = sanitizeString(body.password);

  if (!name) {
    return { error: "Nombre es obligatorio." };
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValidEmail) {
    return { error: "Correo inválido." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  return {
    data: {
      name,
      email,
      password,
      image: sanitizeOptionalString(body.image),
      phone: sanitizeOptionalString(body.phone),
    },
  };
};

const mapCreateAuthErrorMessage = (message: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes("already") || normalized.includes("registered")) {
    return "Ya existe un usuario con ese correo.";
  }

  if (normalized.includes("password")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }

  return `No se pudo crear la cuenta del mesero. ${message}`;
};

export async function GET() {
  const adminContext = await getAdminRequestContext();

  if (!adminContext.ok) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  const primaryResult = await adminContext.adminClient
    .from("staff")
    .select(staffSelectColumns)
    .eq("role", STAFF_ROLE)
    .order("created_at", { ascending: false });

  let data = primaryResult.data;
  let error = primaryResult.error;

  if (isMissingCreatedAtError(error)) {
    // Fallback para tablas antiguas sin created_at.
    const fallbackResult = await adminContext.adminClient
      .from("staff")
      .select(staffSelectColumns)
      .eq("role", STAFF_ROLE)
      .order("name", { ascending: true });

    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (isMissingStaffTableError(error)) {
    const authFallback = await getMeseroUsersFromAuth(adminContext.adminClient);

    if (authFallback.error) {
      return NextResponse.json(
        { error: getPublicStaffLoadError(authFallback.error) },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: authFallback.data });
  }

  if (error) {
    console.error("Error fetching staff in admin API:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json({ error: getPublicStaffLoadError(error) }, { status: 500 });
  }

  return NextResponse.json({ data: (data || []) as StaffRecord[] });
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

  const parsed = parseCreateStaffInput(requestBody);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error || "Payload inválido." }, { status: 400 });
  }

  const { data: authData, error: authError } = await adminContext.adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      name: parsed.data.name,
      role: STAFF_ROLE,
      phone: parsed.data.phone,
      image: parsed.data.image,
    },
  });

  if (authError) {
    return NextResponse.json({ error: mapCreateAuthErrorMessage(authError.message) }, { status: 400 });
  }

  const authUserId = authData.user?.id;

  if (!authUserId) {
    return NextResponse.json({ error: "No se pudo crear la cuenta del mesero." }, { status: 500 });
  }

  const { data, error } = await adminContext.adminClient
    .from("staff")
    .insert([
      {
        name: parsed.data.name,
        position: STAFF_ROLE,
        role: STAFF_ROLE,
        image: parsed.data.image,
        email: parsed.data.email,
        phone: parsed.data.phone,
      },
    ])
    .select("id, name, role, position, image, email, phone")
    .single();

  if (error) {
    if (isMissingStaffTableError(error)) {
      return NextResponse.json({ data: mapAuthUserToStaffRecord(authData.user as AuthUserRecord) }, { status: 201 });
    }

    await adminContext.adminClient.auth.admin.deleteUser(authUserId);
    console.error("Error creating staff in admin API:", error);
    return NextResponse.json({ error: "No se pudo crear el miembro del staff." }, { status: 500 });
  }

  return NextResponse.json({ data: data as StaffRecord }, { status: 201 });
}
