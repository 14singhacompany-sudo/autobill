"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  Package,
  Wrench,
  MoreHorizontal,
  Loader2,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useProductStore, type Product } from "@/stores/productStore";

export default function ProductsPage() {
  const { products, addProduct, updateProduct, removeProduct, fetchProducts, isLoading, error } = useProductStore();

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    type: "product" as "product" | "service",
    category: "",
    unit: "",
    price: "",
    price_includes_vat: false,
    active: true,
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData({ sku: "", name: "", type: "product", category: "", unit: "", price: "", price_includes_vat: false, active: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku || "",
      name: product.name,
      type: product.type,
      category: product.category,
      unit: product.unit,
      price: String(product.price),
      price_includes_vat: product.price_includes_vat ?? false,
      active: product.active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) return;

    if (editingProduct && editingProduct.id) {
      // Update existing product
      await updateProduct(editingProduct.id, {
        sku: formData.sku,
        name: formData.name,
        type: formData.type,
        category: formData.category || "ทั่วไป",
        unit: formData.unit || (formData.type === "service" ? "งาน" : "ชิ้น"),
        price: parseFloat(formData.price) || 0,
        price_includes_vat: formData.price_includes_vat,
        active: formData.active,
      });
    } else {
      // Add new product
      await addProduct({
        sku: formData.sku,
        name: formData.name,
        type: formData.type,
        category: formData.category || "ทั่วไป",
        unit: formData.unit || (formData.type === "service" ? "งาน" : "ชิ้น"),
        price: parseFloat(formData.price) || 0,
        price_includes_vat: formData.price_includes_vat,
        active: true,
      });
    }

    setFormData({ sku: "", name: "", type: "product", category: "", unit: "", price: "", price_includes_vat: false, active: true });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (product: Product) => {
    if (!product.id) return;
    if (confirm(`ต้องการลบ "${product.name}" หรือไม่?`)) {
      await removeProduct(product.id);
    }
  };

  const handleDuplicate = (product: Product) => {
    setEditingProduct(null);
    setFormData({
      sku: product.sku ? `${product.sku}-copy` : "",
      name: `${product.name} (สำเนา)`,
      type: product.type,
      category: product.category,
      unit: product.unit,
      price: String(product.price),
      price_includes_vat: product.price_includes_vat ?? false,
      active: true,
    });
    setIsDialogOpen(true);
  };

  return (
    <div>
      <Header title="สินค้า / บริการ" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาสินค้า/บริการ..."
                className="w-80 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              ตัวกรอง
            </Button>
          </div>
          <Button className="gap-2" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            เพิ่มสินค้า/บริการ
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">รหัส</th>
                <th className="text-left p-4 font-medium">SKU</th>
                <th className="text-left p-4 font-medium">ชื่อ</th>
                <th className="text-left p-4 font-medium">ประเภท</th>
                <th className="text-left p-4 font-medium">หมวดหมู่</th>
                <th className="text-left p-4 font-medium">หน่วย</th>
                <th className="text-right p-4 font-medium">ราคา</th>
                <th className="text-center p-4 font-medium">VAT</th>
                <th className="text-center p-4 font-medium">สถานะ</th>
                <th className="text-center p-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>ยังไม่มีสินค้า/บริการ</p>
                    <p className="text-sm">กดปุ่ม "เพิ่มสินค้า/บริการ" เพื่อเริ่มต้น</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <ProductRow
                    key={product.id || product.code}
                    product={product}
                    onEdit={() => openEditDialog(product)}
                    onDelete={() => handleDelete(product)}
                    onDuplicate={() => handleDuplicate(product)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง 1-{filteredProducts.length} จาก {products.length} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              ก่อนหน้า
            </Button>
            <Button variant="outline" size="sm">
              ถัดไป
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "แก้ไขสินค้า/บริการ" : "เพิ่มสินค้า/บริการใหม่"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">รหัส SKU</Label>
                <Input
                  id="sku"
                  placeholder="เช่น SKU-001"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อสินค้า/บริการ *</Label>
                <Input
                  id="name"
                  placeholder="เช่น บริการออกแบบโลโก้"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">ประเภท</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "product" | "service") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">สินค้า</SelectItem>
                    <SelectItem value="service">บริการ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">หมวดหมู่</Label>
                <Input
                  id="category"
                  placeholder="เช่น ออกแบบ"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">หน่วย</Label>
                <Input
                  id="unit"
                  placeholder="เช่น ชิ้น, งาน, ชม."
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price">ราคา (บาท) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price_includes_vat">ราคารวม VAT หรือไม่</Label>
              <Select
                value={formData.price_includes_vat ? "included" : "excluded"}
                onValueChange={(value) =>
                  setFormData({ ...formData, price_includes_vat: value === "included" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excluded">ไม่รวม VAT (ราคาก่อน VAT)</SelectItem>
                  <SelectItem value="included">รวม VAT แล้ว (ราคาสุทธิ)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.price_includes_vat
                  ? "ราคาที่ตั้ง = ราคาสุทธิ, ต้นทุนจริง = ราคา ÷ 1.07"
                  : "ราคาที่ตั้ง = ต้นทุน, ราคาสุทธิ = ราคา × 1.07"}
              </p>
            </div>

            {editingProduct && (
              <div className="grid gap-2">
                <Label htmlFor="active">สถานะ</Label>
                <Select
                  value={formData.active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, active: value === "active" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งาน</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingProduct ? "บันทึกการแก้ไข" : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductRow({
  product,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { code, sku, name, type, category, unit, price, price_includes_vat, active } = product;

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="p-4 font-mono text-sm">{code}</td>
      <td className="p-4 font-mono text-sm text-muted-foreground">{sku || "-"}</td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded ${
              type === "service"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {type === "service" ? (
              <Wrench className="h-4 w-4" />
            ) : (
              <Package className="h-4 w-4" />
            )}
          </div>
          <span className="font-medium">{name}</span>
        </div>
      </td>
      <td className="p-4">
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full ${
            type === "service"
              ? "bg-purple-100 text-purple-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {type === "service" ? "บริการ" : "สินค้า"}
        </span>
      </td>
      <td className="p-4 text-muted-foreground">{category}</td>
      <td className="p-4">{unit}</td>
      <td className="p-4 text-right font-medium">{formatCurrency(price)}</td>
      <td className="p-4 text-center">
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full ${
            price_includes_vat
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {price_includes_vat ? "รวม VAT" : "ไม่รวม VAT"}
        </span>
      </td>
      <td className="p-4 text-center">
        <span
          className={`inline-block px-2 py-1 text-xs rounded-full ${
            active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {active ? "ใช้งาน" : "ไม่ใช้งาน"}
        </span>
      </td>
      <td className="p-4 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              แก้ไข
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              คัดลอก
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              ลบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
