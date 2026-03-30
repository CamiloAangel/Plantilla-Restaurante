# Guía: Estructura de Rutas en Next.js App Router

## ¿Cómo se crean las rutas automáticamente?

En Next.js con App Router, **la estructura de carpetas determina las rutas automáticamente**:

```
app/
├── page.tsx              → /
├── layout.tsx            → Layout global
├── login/
│   └── page.tsx          → /login ✅ (Acaba de crear)
├── menu/
│   └── page.tsx          → /menu
├── signup/
│   └── page.tsx          → /signup (Próxima que deberías crear)
├── stories/
│   └── page.tsx          → /stories
├── order/
│   └── page.tsx          → /order
├── forgot-password/
│   └── page.tsx          → /forgot-password
└── components/
    └── home/
        ├── Navbar.tsx    (NO es una ruta, es componente)
        └── ...
```

## Regla de Oro: `page.tsx` = Ruta

**Solo los archivos llamados `page.tsx` crean rutas.**

❌ **INCORRECTO:**
```
app/pages/login/page.tsx    → ERROR (crearía /pages/login)
```

✅ **CORRECTO:**
```
app/login/page.tsx          → ✅ /login
```

## Próximas Páginas a Crear (según tu navbar)

Tu navbar tiene estos enlaces:
- ✅ Home: `app/page.tsx`
- ✅ Menu: `app/menu/page.tsx`
- ✅ Stories: `app/stories/page.tsx`
- ✅ Escribenos (Order): `app/order/page.tsx`
- Botón Login: ✅ `app/login/page.tsx` (CREADA)

**Próximas que necesitarás:**
1. `app/signup/page.tsx` → Registro de usuarios
2. `app/forgot-password/page.tsx` → Recuperar contraseña
3. `app/stories/page.tsx` → Si aún no existe
4. `app/order/page.tsx` → Si aún no existe

---

## Estructura Completa Recomendada

```
app/
├── layout.tsx                    # Layout global con Navbar
├── page.tsx                      # Home
├── globals.css
├── login/
│   └── page.tsx                  # Login
├── signup/
│   └── page.tsx                  # Signup
├── forgot-password/
│   └── page.tsx                  # Recuperar contraseña
├── reset-password/
│   └── page.tsx                  # Resetear contraseña (con token)
├── menu/
│   └── page.tsx                  # Menú
├── stories/
│   └── page.tsx                  # Historias
├── order/
│   └── page.tsx                  # Hacer pedido
├── dashboard/
│   ├── layout.tsx                # Layout especial para dashboard
│   ├── page.tsx                  # Dashboard principal
│   ├── products/
│   │   └── page.tsx              # Gestionar productos
│   ├── orders/
│   │   └── page.tsx              # Ver órdenes
│   └── analytics/
│       └── page.tsx              # Estadísticas
├── api/
│   ├── auth/
│   │   ├── login/route.ts        # POST /api/auth/login
│   │   ├── signup/route.ts       # POST /api/auth/signup
│   │   └── logout/route.ts       # POST /api/auth/logout
│   └── products/
│       └── route.ts              # GET /api/products
└── components/
    ├── home/
    │   ├── Navbar.tsx
    │   └── ...
    ├── menu/
    │   ├── MenuSection.tsx
    │   └── PromoSection.tsx
    └── ...
```

---

## Pasos para Agregar una Nueva Ruta

**Ejemplo: Agregar página `/signup`**

1. **Crea la carpeta:**
   ```
   app/signup/
   ```

2. **Crea el archivo `page.tsx`:**
   ```
   app/signup/page.tsx
   ```

3. **Agrega el contenido:**
   ```typescript
   export default function SignupPage() {
     return <main>...</main>
   }
   ```

4. **¡Listo!** La ruta `/signup` estará disponible automáticamente

---

## Tipos de Archivos Especiales en Next.js

| Archivo | Propósito |
|---------|-----------|
| `page.tsx` | Crea una ruta (la página que ves) |
| `layout.tsx` | Estructura HTML común (navbar, footer, etc) |
| `route.ts` | Crea un endpoint API `/api/...` |
| `loading.tsx` | Skeleton mientras carga (Suspense) |
| `error.tsx` | Maneja errores en esa ruta |
| `not-found.tsx` | Página 404 personalizada |
| `globals.css` | Estilos globales |

---

## Resumen

**Para próximas rutas, solo recuerda:**
1. Crea una carpeta con el nombre de la ruta: `app/nombre-ruta/`
2. Crea `page.tsx` dentro
3. ¡Listo! Ya está disponible en `/nombre-ruta`

**NO hagas:**
- ❌ `app/pages/...` (evita "pages" en la carpeta)
- ❌ Archivos con otros nombres como `index.tsx` o `app.tsx`
- ❌ Componentes dentro de `app/` sin carpeta propia
