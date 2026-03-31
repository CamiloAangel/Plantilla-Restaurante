import { NextResponse } from "next/server";
import { getAdminRequestContext } from "@/lib/auth/adminApi";

const STAFF_ROLE = "Mesero";

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

interface UpdateStaffInput {
  name?: string;
  role?: string;
  position?: string;
  image?: string | null;
  email?: string | null;
  phone?: string | null;
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

const parseUpdateStaffInput = (payload: unknown): { data?: UpdateStaffInput; error?: string } => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload inválido." };
  }

  const body = payload as Record<string, unknown>;
  const updates: UpdateStaffInput = {};
  let hasEditableField = false;

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    hasEditableField = true;
    const name = sanitizeString(body.name);
    if (!name) {
      return { error: "El nombre no puede estar vacío." };
    }
    updates.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "role")) {
    const roleCandidate = sanitizeString(body.role);
    if (roleCandidate !== STAFF_ROLE) {
      return { error: "Solo se permite el rol Mesero." };
    }
    hasEditableField = true;
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    hasEditableField = true;
    updates.phone = sanitizeOptionalString(body.phone);
  }

  if (Object.prototype.hasOwnProperty.call(body, "image")) {
    hasEditableField = true;
    updates.image = sanitizeOptionalString(body.image);
  }

  if (!hasEditableField) {
    return { error: "No se recibieron campos para actualizar." };
  }

  updates.role = STAFF_ROLE;
  updates.position = STAFF_ROLE;

  return { data: updates };
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Id de staff inválido." }, { status: 400 });
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

  const parsed = parseUpdateStaffInput(requestBody);

  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error || "Payload inválido." }, { status: 400 });
  }

  const { data, error } = await adminContext.adminClient
    .from("staff")
    .update(parsed.data)
    .eq("id", id)
    .eq("role", STAFF_ROLE)
    .select("id, name, role, position, image, email, phone")
    .single();

  if (error) {
    if (isMissingStaffTableError(error)) {
      const { data: authUserData, error: authUserError } = await adminContext.adminClient.auth.admin.getUserById(id);

      if (authUserError || !authUserData.user) {
        return NextResponse.json({ error: "No se encontró el usuario del mesero." }, { status: 404 });
      }

      const currentMetadata = (authUserData.user.user_metadata || {}) as Record<string, unknown>;
      const nextMetadata: Record<string, unknown> = {
        ...currentMetadata,
        role: STAFF_ROLE,
      };

      if (typeof parsed.data.name === "string") {
        nextMetadata.name = parsed.data.name;
      }

      if (Object.prototype.hasOwnProperty.call(parsed.data, "phone")) {
        nextMetadata.phone = parsed.data.phone;
      }

      if (Object.prototype.hasOwnProperty.call(parsed.data, "image")) {
        nextMetadata.image = parsed.data.image;
      }

      const { data: updatedAuthUserData, error: updatedAuthUserError } = await adminContext.adminClient.auth.admin.updateUserById(id, {
        user_metadata: nextMetadata,
      });

      if (updatedAuthUserError || !updatedAuthUserData.user) {
        return NextResponse.json({ error: "No se pudo actualizar el usuario del mesero." }, { status: 500 });
      }

      return NextResponse.json({ data: mapAuthUserToStaffRecord(updatedAuthUserData.user as AuthUserRecord) });
    }

    console.error("Error updating staff in admin API:", error);
    return NextResponse.json({ error: "No se pudo actualizar el miembro del staff." }, { status: 500 });
  }

  return NextResponse.json({ data: data as StaffRecord });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Id de staff inválido." }, { status: 400 });
  }

  const adminContext = await getAdminRequestContext();

  if (!adminContext.ok) {
    return NextResponse.json({ error: adminContext.error }, { status: adminContext.status });
  }

  const { error } = await adminContext.adminClient
    .from("staff")
    .delete()
    .eq("id", id)
    .eq("role", STAFF_ROLE);

  if (error) {
    if (isMissingStaffTableError(error)) {
      const { error: deleteAuthError } = await adminContext.adminClient.auth.admin.deleteUser(id);

      if (deleteAuthError) {
        return NextResponse.json({ error: "No se pudo eliminar la cuenta del mesero." }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    console.error("Error deleting staff in admin API:", error);
    return NextResponse.json({ error: "No se pudo eliminar el miembro del staff." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
