"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Building2,
  User,
  Phone,
  Mail,
  Loader2,
  MapPin,
  FileText,
  Copy,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomerStore, type CustomerFormData } from "@/stores/customerStore";
import type { Customer, CustomerType } from "@/types/database";

export default function CustomersPage() {
  const { customers, isLoading, error, fetchCustomers, updateCustomer, deleteCustomer } = useCustomerStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = async (data: CustomerFormData) => {
    if (!editingCustomer) return;

    setIsSaving(true);
    try {
      await updateCustomer(editingCustomer.id, data);
      toast({
        title: "บันทึกสำเร็จ",
        description: "แก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว",
      });
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;

    setIsSaving(true);
    try {
      await deleteCustomer(deletingCustomer.id);
      toast({
        title: "ลบสำเร็จ",
        description: "ลบข้อมูลลูกค้าเรียบร้อยแล้ว",
      });
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    const search = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.contact_name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.phone?.includes(search) ||
      customer.tax_id?.includes(search)
    );
  });

  return (
    <div>
      <Header title="ลูกค้า" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาลูกค้า..."
              className="w-80 pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="gap-2" disabled>
            <Plus className="h-4 w-4" />
            เพิ่มลูกค้า
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" onClick={() => fetchCustomers()}>
                ลองใหม่
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredCustomers.length === 0 && (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">
                {searchTerm ? "ไม่พบลูกค้าที่ค้นหา" : "ยังไม่มีข้อมูลลูกค้า"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm
                  ? "ลองค้นหาด้วยคำอื่น"
                  : "ข้อมูลลูกค้าจะถูกบันทึกอัตโนมัติเมื่อสร้างใบกำกับภาษีหรือใบเสนอราคา"}
              </p>
            </div>
          </div>
        )}

        {/* Customer Cards */}
        {!isLoading && !error && filteredCustomers.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onEdit={handleEditCustomer}
                  onDelete={handleDeleteCustomer}
                />
              ))}
            </div>

            {/* Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                แสดง {filteredCustomers.length} ลูกค้า
              </p>
            </div>
          </>
        )}
      </div>

      {/* Edit Dialog */}
      <EditCustomerDialog
        customer={editingCustomer}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบข้อมูลลูกค้า &quot;{deletingCustomer?.name}&quot; ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

function CustomerCard({ customer, onEdit, onDelete }: CustomerCardProps) {
  const type = customer.customer_type === "individual" ? "individual" : "company";
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyInfo = () => {
    const lines: string[] = [];

    lines.push("===== ข้อมูลลูกค้า =====");
    lines.push(`ชื่อ: ${customer.name || "-"}`);
    lines.push(`ผู้ติดต่อ: ${customer.contact_name || "-"}`);
    lines.push(`ที่อยู่: ${customer.address || "-"}`);
    lines.push(`โทรศัพท์: ${customer.phone || "-"}`);
    lines.push(`อีเมล: ${customer.email || "-"}`);
    lines.push(`เลขประจำตัวผู้เสียภาษี: ${customer.tax_id || "-"}`);
    if (customer.tax_id) {
      const branchText = customer.branch_code && customer.branch_code !== "00000"
        ? customer.branch_code
        : "00000 (สำนักงานใหญ่)";
      lines.push(`รหัสสาขา: ${branchText}`);
    }
    lines.push("========================");

    const text = lines.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "คัดลอกแล้ว",
      description: "ข้อมูลลูกค้าถูกคัดลอกไปยังคลิปบอร์ด",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                type === "company"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {type === "company" ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {customer.name}
              </h3>
              {customer.contact_name && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {customer.contact_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopyInfo}
              title="คัดลอกข้อมูล"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(customer)}
              title="แก้ไข"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(customer)}
              title="ลบ"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 text-xs">
          {customer.tax_id && (
            <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {customer.tax_id}
                {customer.branch_code && customer.branch_code !== "00000"
                  ? ` (สาขา ${customer.branch_code})`
                  : " (สำนักงานใหญ่)"}
              </span>
            </div>
          )}

          {customer.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{customer.phone}</span>
            </div>
          )}

          {customer.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}

          {customer.address && (
            <div className="flex items-start gap-2 text-muted-foreground pt-1 border-t mt-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed">{customer.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EditCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CustomerFormData) => Promise<void>;
  isSaving: boolean;
}

function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: EditCustomerDialogProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    customer_type: "company",
    name: "",
    tax_id: "",
    branch_code: "00000",
    address: "",
    contact_name: "",
    phone: "",
    email: "",
  });

  // Update form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        customer_type: customer.customer_type || "company",
        name: customer.name || "",
        tax_id: customer.tax_id || "",
        branch_code: customer.branch_code || "00000",
        address: customer.address || "",
        contact_name: customer.contact_name || "",
        phone: customer.phone || "",
        email: customer.email || "",
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลลูกค้า</DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลลูกค้าและกดบันทึกเมื่อเสร็จสิ้น
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer_type">ประเภทลูกค้า</Label>
              <Select
                value={formData.customer_type}
                onValueChange={(value: CustomerType) =>
                  setFormData({ ...formData, customer_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">นิติบุคคล</SelectItem>
                  <SelectItem value="individual">บุคคลธรรมดา</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">ชื่อ *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tax_id">เลขประจำตัวผู้เสียภาษี</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id || ""}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch_code">รหัสสาขา</Label>
                <Input
                  id="branch_code"
                  value={formData.branch_code || "00000"}
                  onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                  placeholder="00000 = สำนักงานใหญ่"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact_name">ผู้ติดต่อ</Label>
              <Input
                id="contact_name"
                value={formData.contact_name || ""}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">โทรศัพท์</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">ที่อยู่</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSaving || !formData.name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
