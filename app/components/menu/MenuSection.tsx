'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getActiveProductCategories, getActiveProductsByCategory, getMonthTopProductByCategory, getMonthTopProductByAllCategories, type Product } from '@/lib/supabaseProducts';

// Cache simple para evitar refetch innecesario
const cache: Record<string, { data: Product[]; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export default function MenuSection() {
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar TODO en paralelo en el primer render
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      try {
        // Cargar categorías, productos y favoritos EN PARALELO
        const [categoriesData, productsData, topProductsData] = await Promise.all([
          getActiveProductCategories(),
          getActiveProductsByCategory(),
          getMonthTopProductByAllCategories(),
        ]);
        
        if (categoriesData) setCategories(categoriesData);
        if (productsData) setProducts(productsData);
        if (topProductsData) setTopProducts(topProductsData);
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Cargar productos y favoritos cuando cambia la categoría seleccionada
  useEffect(() => {
    if (selectedCategory === null && products.length > 0) {
      // Ya tenemos datos, no recargar
      return;
    }

    const loadProductsAndTopProducts = async () => {
      setIsLoading(true);
      const cacheKey = `category_${selectedCategory || 'all'}`;

      try {
        // Verificar cache
        if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_DURATION) {
          const cachedProducts = cache[cacheKey].data;
          setProducts(cachedProducts);
          
          if (selectedCategory === null) {
            const allTopProducts = await getMonthTopProductByAllCategories();
            setTopProducts(allTopProducts || []);
          } else {
            const topProductData = await getMonthTopProductByCategory(selectedCategory);
            setTopProducts(topProductData ? [topProductData] : []);
          }
          return;
        }

        // Si no hay categoría seleccionada (Todos), los datos ya están cargados
        if (selectedCategory === null) {
          setIsLoading(false);
          return;
        }

        // Cargar datos de categoría específica EN PARALELO
        const [productsData, topProductData] = await Promise.all([
          getActiveProductsByCategory(selectedCategory),
          getMonthTopProductByCategory(selectedCategory),
        ]);

        const products = productsData || [];
        cache[cacheKey] = { data: products, timestamp: Date.now() };
        
        setProducts(products);
        setTopProducts(topProductData ? [topProductData] : []);
      } catch (error) {
        console.error("Error al cargar productos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductsAndTopProducts();
  }, [selectedCategory, products.length]);

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
  };

  return (
    <>
      {/* Hero Section: Editorial Header */}
      <section className="px-6 py-12 md:py-20 max-w-7xl mx-auto overflow-hidden">
        <div className="relative">
          <h1 className="font-headline font-black text-6xl md:text-8xl lg:text-9xl text-[#ab2d00] tracking-tighter leading-[0.85] z-10 relative uppercase italic">
            Nuestro<br/>Menú
          </h1>
          <div className="absolute -right-4 md:right-20 -top-4 md:top-0 w-48 md:w-80 h-48 md:h-80 rounded-xl overflow-hidden -rotate-6 shadow-xl z-0">
            <img 
              alt="Gourmet Burger" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmQ8x59heAlWb2e6Ngtu4IDkU6yKNVg9GJJkiQkFEF8hPz5VdQF1-VmTWJkf98vdvrNEhlgJX4jIw-RXUXa1PFOQWyL-671zdbEMa6IPio482eG4-fHFrhVPpBvepgZIBhFD7sLL1w4YbaCStxpdk7Tb1Yi1ETRyKBZ7zNyg3HrlCdC2-1Hjaq2LKtCMzOfijvNjWPz0UyoBm8OAVXgfBNVC4i5tYEd97HHAbKEK9-o4O-pUStf5QwuFpg9yApWDkQoGv7_hRh"
            />
          </div>
          <p className="font-body italic text-2xl md:text-4xl text-[#2e2f2e] mt-8 max-w-2xl leading-tight">
            Descubre nuestro menú completo con las mejores 
            opciones de comida de calle.
          </p>
        </div>
      </section>

      {/* Category Filter - Sticky */}
      <section className="sticky top-[73px] z-40 bg-[#f7f6f4] py-6 px-6 overflow-x-auto scrollbar-hide border-b border-[#e8e8e6] shadow-sm">
        <div className="flex gap-4 max-w-7xl mx-auto flex-nowrap">
          <button 
            onClick={() => handleCategoryChange(null)}
            className={`flex-none px-8 py-3 rounded-full font-headline font-bold text-sm tracking-widest uppercase flex items-center gap-2 transition-colors ${
              selectedCategory === null
                ? 'bg-[#fdd400] text-[#594a00]'
                : 'bg-[#f1f1ef] text-[#2e2f2e] hover:bg-[#e2e3e0]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">restaurant_menu</span> 
            Todos
          </button>

          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`flex-none px-8 py-3 rounded-full font-headline font-bold text-sm tracking-widest uppercase transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-[#fdd400] text-[#594a00]'
                  : 'bg-[#f1f1ef] text-[#2e2f2e] hover:bg-[#e2e3e0]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Menu Grid */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <p className="font-headline font-bold text-lg text-[#5b5c5a]">Cargando productos...</p>
          </div>
        ) : products.length === 0 && topProducts.length === 0 ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <p className="font-headline font-bold text-lg text-[#5b5c5a]">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* Mostrar favoritos */}
            {topProducts.map((topProduct) => (
              <div key={`top-${topProduct.id}`} className="lg:col-span-2 group relative flex flex-col md:flex-row gap-8 bg-[#ffffff] p-6 rounded-xl shadow-sm border border-[#adadab]/10">
                <div className="w-full md:w-1/2 aspect-video md:aspect-square rounded-lg overflow-hidden">
                  {topProduct.image_url ? (
                    <img 
                      alt={topProduct.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      src={topProduct.image_url}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f1f1ef] to-[#e8e8e6]">
                      <span className="text-[#adadab] font-headline font-bold">Sin imagen</span>
                    </div>
                  )}
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center gap-4">
                  <span className="font-headline text-[#6d5a00] font-bold uppercase tracking-[0.2em] text-xs">
                    Nuestra Favorita del Mes{selectedCategory !== null && ` - ${topProduct.category}`}
                  </span>
                  <h3 className="font-headline font-black text-4xl text-[#2e2f2e] leading-none">
                    {topProduct.name.toUpperCase()}
                  </h3>
                  <p className="font-body italic text-xl text-[#5b5c5a] leading-relaxed">
                    {topProduct.description}
                  </p>
                  <div className="flex items-center gap-6 mt-4">
                    <span className="font-headline font-black text-3xl text-[#ab2d00]">
                      ${topProduct.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Productos regulares */}
            {products.map((product) => (
              <div key={product.id} className="group relative flex flex-col gap-4">
                {/* Imagen del producto */}
                <div className="aspect-[4/5] rounded-xl overflow-hidden bg-[#e8e8e6] relative">
                  {product.image_url ? (
                    <img 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      src={product.image_url}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f1f1ef] to-[#e8e8e6]">
                      <span className="text-[#adadab] font-headline font-bold">Sin imagen</span>
                    </div>
                  )}
                </div>

                {/* Información del producto */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-headline font-bold text-2xl text-[#2e2f2e] tracking-tight">
                      {product.name}
                    </h3>
                    <p className="font-body italic text-[#5b5c5a] text-lg line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                  <span className="font-headline font-extrabold text-xl text-[#ab2d00] whitespace-nowrap">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}