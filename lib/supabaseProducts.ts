import { supabase } from "./supabaseClient";

/**
 * Interfaz para los productos
 */
export interface Product {
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

export interface CreateProductInput {
  name: string;
  price: number;
  description: string;
  category: string;
  image_url?: string | null;
  active?: boolean;
  stock?: number;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  description?: string;
  category?: string;
  image_url?: string | null;
  active?: boolean;
  stock?: number;
}

interface OrderItemWithProduct {
  quantity: number | null;
  products: Product | Product[] | null;
}

const getProductFromRelation = (
  productRelation: OrderItemWithProduct["products"]
): Product | null => {
  if (Array.isArray(productRelation)) {
    return productRelation[0] ?? null;
  }

  return productRelation;
};

/**
 * Obtener todas las categorías únicas de productos activos
 */
export const getActiveProductCategories = async (): Promise<string[] | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .eq("active", true)
      .order("category", { ascending: true });

    if (error) {
      console.error("Error al obtener categorías:", error);
      return null;
    }

    // Extraer categorías únicas
    const categories = Array.from(new Set(data?.map(item => item.category) || []));
    return categories;
  } catch (error) {
    console.error("Error en getActiveProductCategories:", error);
    return null;
  }
};

/**
 * Obtener productos activos de una categoría específica
 */
export const getActiveProductsByCategory = async (category?: string): Promise<Product[] | null> => {
  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("active", true);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener productos activos:", error);
      return null;
    }

    return data as Product[];
  } catch (error) {
    console.error("Error en getActiveProductsByCategory:", error);
    return null;
  }
};

/**
 * Obtener el producto más vendido del mes actual por categoría (OPTIMIZADO)
 */
export const getMonthTopProductByCategory = async (category?: string): Promise<Product | null> => {
  try {
    // Obtener rango del mes actual
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Obtener SOLO el TOP 1 producto con JOIN y GROUP BY en SQL (mucho más rápido)
    let query = supabase
      .from("order_items")
      .select(`
        quantity,
        products!inner (
          id,
          name,
          price,
          description,
          category,
          image_url,
          active,
          stock,
          created_at,
          updated_at,
          admin_id
        ),
        orders!inner (created_at)
      `)
      .eq("products.active", true)
      .gte("orders.created_at", monthStart.toISOString())
      .lte("orders.created_at", monthEnd.toISOString())
      .limit(1000); // Limitar para no traer demasiados

    if (category) {
      query = query.eq("products.category", category);
    }

    const { data: orderItems, error } = await query;

    if (error) {
      console.error("Error al obtener items del mes:", error);
      return null;
    }

    if (!orderItems || orderItems.length === 0) {
      return null;
    }

    // Procesar en memoria (mucho menos datos ahora)
    const productSales: Record<string, { count: number; product: Product }> = {};
    const typedOrderItems = (orderItems || []) as OrderItemWithProduct[];

    typedOrderItems.forEach((item) => {
      const product = getProductFromRelation(item.products);

      if (product) {
        if (!productSales[product.id]) {
          productSales[product.id] = { count: 0, product };
        }
        productSales[product.id].count += item.quantity || 1;
      }
    });

    // Encontrar el producto con más cantidad vendida
    let topProduct: Product | null = null;
    let maxCount = 0;

    Object.values(productSales).forEach(({ count, product }) => {
      if (count > maxCount) {
        maxCount = count;
        topProduct = product;
      }
    });

    return topProduct;
  } catch (error) {
    console.error("Error en getMonthTopProductByCategory:", error);
    return null;
  }
};

/**
 * Obtener el producto más vendido del mes por TODAS las categorías (OPTIMIZADO)
 */
export const getMonthTopProductByAllCategories = async (): Promise<Product[] | null> => {
  try {
    // Obtener rango del mes actual
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Traer MENOS datos: filtrar en BD primero
    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(`
        quantity,
        products!inner (
          id,
          name,
          price,
          description,
          category,
          image_url,
          active,
          stock,
          created_at,
          updated_at,
          admin_id
        ),
        orders!inner (created_at)
      `)
      .eq("products.active", true)
      .gte("orders.created_at", monthStart.toISOString())
      .lte("orders.created_at", monthEnd.toISOString())
      .limit(1000); // Limitar para mejorar performance

    if (error) {
      console.error("Error al obtener items del mes:", error);
      return null;
    }

    if (!orderItems || orderItems.length === 0) {
      return null;
    }

    // Agrupar por categoría y dentro por product_id (menos iteraciones)
    const categorySales: Record<string, Record<string, { count: number; product: Product }>> = {};
    const typedOrderItems = (orderItems || []) as OrderItemWithProduct[];

    typedOrderItems.forEach((item) => {
      const product = getProductFromRelation(item.products);

      if (product) {
        const category = product.category;

        if (!categorySales[category]) {
          categorySales[category] = {};
        }

        if (!categorySales[category][product.id]) {
          categorySales[category][product.id] = { count: 0, product };
        }

        categorySales[category][product.id].count += item.quantity || 1;
      }
    });

    // Obtener el top product de cada categoría
    const topProducts: Product[] = [];

    Object.entries(categorySales).forEach(([, products]) => {
      let topProduct: Product | null = null;
      let maxCount = 0;

      Object.values(products).forEach(({ count, product }) => {
        if (count > maxCount) {
          maxCount = count;
          topProduct = product;
        }
      });

      if (topProduct) {
        topProducts.push(topProduct);
      }
    });

    return topProducts;
  } catch (error) {
    console.error("Error en getMonthTopProductByAllCategories:", error);
    return null;
  }
};

/**
 * Obtener todos los productos
 */
export const getProducts = async (): Promise<Product[] | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener productos:", error);
      return null;
    }

    return data as Product[];
  } catch (error) {
    console.error("Error en getProducts:", error);
    return null;
  }
};

/**
 * Obtener un producto por ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error al obtener producto:", error);
      return null;
    }

    return data as Product;
  } catch (error) {
    console.error("Error en getProductById:", error);
    return null;
  }
};

/**
 * Crear un nuevo producto
 */
export const createProduct = async (
  product: CreateProductInput,
  imageFile?: File
): Promise<Product | null> => {
  try {
    // Obtener el usuario autenticado actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Error: Usuario no autenticado", authError);
      return null;
    }

    let image_url: string | null = null;

    // Si hay imagen, subirla a Storage
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error("Error al subir imagen:", uploadError);
        return null;
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      image_url = publicData.publicUrl;
    }

    // Insertar producto con URL de imagen
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: product.name,
          price: product.price,
          description: product.description,
          category: product.category,
          active: product.active ?? true,
          stock: product.stock ?? 0,
          admin_id: user.id,
          image_url: image_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error al crear producto:", JSON.stringify(error));
      return null;
    }

    return data as Product;
  } catch (error) {
    console.error("Error en createProduct:", error);
    return null;
  }
};

/**
 * Actualizar un producto
 */
export const updateProduct = async (
  id: string,
  updates: UpdateProductInput,
  newImageFile?: File
): Promise<Product | null> => {
  try {
    const updatePayload: UpdateProductInput & { updated_at: string } = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Si hay imagen nueva, subirla
    if (newImageFile) {
      const fileExt = newImageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, newImageFile);

      if (uploadError) {
        console.error("Error al subir imagen:", uploadError);
        return null;
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      updatePayload.image_url = publicData.publicUrl;
    } else if (!Object.prototype.hasOwnProperty.call(updates, "image_url")) {
      // Si no se envió imagen, no tocar la existente
      delete updatePayload.image_url;
    }

    // Actualizar producto
    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar producto:", error);
      return null;
    }

    return data as Product;
  } catch (error) {
    console.error("Error en updateProduct:", error);
    return null;
  }
};

/**
 * Eliminar un producto
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    // Primero obtener el producto para conocer la URL de imagen
    const product = await getProductById(id);

    // Eliminar imagen de Storage si existe
    if (product?.image_url) {
      // Extraer el path de la URL pública
      const pathMatch = product.image_url.match(/storage\/v1\/object\/public\/product-images\/(.+)$/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        await supabase.storage.from("product-images").remove([filePath]);
      }
    }

    // Eliminar el producto de la BD
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Error al eliminar producto:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error en deleteProduct:", error);
    return false;
  }
};

/**
 * Alternar estado activo/inactivo
 */
export const toggleProductStatus = async (
  id: string,
  currentStatus: boolean
): Promise<Product | null> => {
  return updateProduct(id, { active: !currentStatus });
};

/**
 * Incrementar stock del producto
 */
export const incrementStock = async (id: string): Promise<number | null> => {
  try {
    const product = await getProductById(id);
    if (!product) return null;

    const newStock = product.stock + 1;
    const { data, error } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", id)
      .select("stock")
      .single();

    if (error) {
      console.error("Error al incrementar stock:", error);
      return null;
    }

    const stockRow = data as Pick<Product, "stock"> | null;
    return stockRow?.stock ?? null;
  } catch (error) {
    console.error("Error en incrementStock:", error);
    return null;
  }
};

/**
 * Decrementar stock del producto
 * Si stock llega a 0, desactiva el producto automáticamente
 */
export const decrementStock = async (id: string): Promise<number | null> => {
  try {
    const product = await getProductById(id);
    if (!product) return null;

    const newStock = Math.max(0, product.stock - 1);
    
    // Si stock llega a 0, desactivar el producto
    const updateData = {
      stock: newStock,
      ...(newStock === 0 && { active: false })
    };

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error al decrementar stock:", error);
      return null;
    }

    return (data as Product).stock;
  } catch (error) {
    console.error("Error en decrementStock:", error);
    return null;
  }
};
