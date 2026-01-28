import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

export interface Product {
  id?: string;
  code: string;
  sku: string;
  name: string;
  type: "product" | "service";
  category: string;
  unit: string;
  price: number;
  price_includes_vat: boolean;
  active: boolean;
}

interface ProductStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, "id" | "code"> & { sku?: string }) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  getActiveProducts: () => Product[];
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const products: Product[] = (data || []).map((p) => ({
        id: p.id,
        code: p.code,
        sku: p.sku || "",
        name: p.name,
        type: p.type as "product" | "service",
        category: p.category || "",
        unit: p.unit,
        price: Number(p.price),
        price_includes_vat: p.price_includes_vat ?? false,
        active: p.active,
      }));

      set({ products, isLoading: false });
    } catch (error) {
      console.error("Error fetching products:", error);
      set({ error: "ไม่สามารถโหลดข้อมูลสินค้าได้", isLoading: false });
    }
  },

  addProduct: async (product) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      // Generate code
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      const newCode = `PRD-${String((count || 0) + 1).padStart(3, "0")}`;

      const { data, error } = await supabase
        .from("products")
        .insert({
          code: newCode,
          sku: product.sku || "",
          name: product.name,
          type: product.type,
          category: product.category,
          unit: product.unit,
          price: product.price,
          price_includes_vat: product.price_includes_vat ?? false,
          active: product.active,
        })
        .select()
        .single();

      if (error) throw error;

      const newProduct: Product = {
        id: data.id,
        code: data.code,
        sku: data.sku || "",
        name: data.name,
        type: data.type as "product" | "service",
        category: data.category || "",
        unit: data.unit,
        price: Number(data.price),
        price_includes_vat: data.price_includes_vat ?? false,
        active: data.active,
      };

      set((state) => ({
        products: [newProduct, ...state.products],
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error adding product:", error);
      set({ error: "ไม่สามารถเพิ่มสินค้าได้", isLoading: false });
    }
  },

  updateProduct: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error updating product:", error);
      set({ error: "ไม่สามารถอัพเดทสินค้าได้", isLoading: false });
    }
  },

  removeProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error removing product:", error);
      set({ error: "ไม่สามารถลบสินค้าได้", isLoading: false });
    }
  },

  getActiveProducts: () => {
    return get().products.filter((p) => p.active);
  },
}));
