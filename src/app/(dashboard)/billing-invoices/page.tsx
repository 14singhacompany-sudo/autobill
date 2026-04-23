"use client";

import { useEffect, useState, Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Eye,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Copy,
  Printer,
  MoreHorizontal,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBillingInvoiceStore } from "@/stores/billingInvoiceStore";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function BillingInvoicesPage() {
  return (
    <Suspense fallback={<BillingInvoicesPageLoading />}>
      <BillingInvoicesPageContent />
    </Suspense>
  );
}

function BillingInvoicesPageLoading() {
  return (
    <div>
      <Header title="ใบแจ้งหนี้" />
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </div>
  );
}

function BillingInvoicesPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { billingInvoices, fetchBillingInvoices, deleteBillingInvoice, markAsPaid, isLoading } = useBillingInvoiceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    number: string;
    canDelete: boolean;
  }>({ open: false, id: "", number: "", canDelete: true });

  useEffect(() => {
    fetchBillingInvoices();
  }, [fetchBillingInvoices]);

  const filteredInvoices = billingInvoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteClick = (id: string, number: string, status: string) => {
    const canDelete = status === "draft";
    setDeleteDialog({ open: true, id, number, canDelete });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.canDelete) {
      await deleteBillingInvoice(deleteDialog.id);
    }
    setDeleteDialog({ open: false, id: "", number: "", canDelete: true });
  };

  const handlePrint = (id: string) => {
    window.open(`/billing-invoices/${id}/preview?print=true`, '_blank');
  };

  const handleDuplicate = (id: string) => {
    router.push(`/billing-invoices/new?duplicate=${id}`);
  };

  const handleMarkAsPaid = async (id: string, number: string) => {
    const result = await markAsPaid(id);
    if (result.success) {
      toast({
        title: "บันทึกการชำระเงินสำเร็จ",
        description: `ใบแจ้งหนี้ ${number} ถูกชำระแล้ว`,
      });
    } else {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: result.reason,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredInvoices.map((inv) => inv.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      <Header title="ใบแจ้งหนี้" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาใบแจ้งหนี้..."
                className="w-80 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/billing-invoices/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                สร้างใบแจ้งหนี้
              </Button>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 w-12">
                  <Checkbox
                    checked={filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 font-medium">เลขที่</th>
                <th className="text-left p-4 font-medium">ลูกค้า</th>
                <th className="text-left p-4 font-medium">วันที่ออก</th>
                <th className="text-left p-4 font-medium">ครบกำหนด</th>
                <th className="text-right p-4 font-medium">จำนวนเงิน</th>
                <th className="text-left p-4 font-medium">สถานะ</th>
                <th className="text-center p-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>ยังไม่มีใบแจ้งหนี้</p>
                    <p className="text-sm">กดปุ่ม &quot;สร้างใบแจ้งหนี้&quot; เพื่อเริ่มต้น</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <BillingInvoiceRow
                    key={invoice.id}
                    id={invoice.id}
                    number={invoice.invoice_number}
                    customer={invoice.customer_name}
                    issueDate={formatDate(invoice.issue_date)}
                    dueDate={formatDate(invoice.due_date)}
                    amount={formatCurrency(invoice.total_amount || 0)}
                    status={invoice.status as any || "draft"}
                    isSelected={selectedIds.includes(invoice.id)}
                    onSelect={(checked) => handleSelectOne(invoice.id, checked)}
                    onDelete={() => handleDeleteClick(invoice.id, invoice.invoice_number, invoice.status || "draft")}
                    onEdit={() => router.push(`/billing-invoices/${invoice.id}/edit`)}
                    onPreview={() => router.push(`/billing-invoices/${invoice.id}/preview`)}
                    onDuplicate={() => handleDuplicate(invoice.id)}
                    onPrint={() => handlePrint(invoice.id)}
                    onMarkAsPaid={() => handleMarkAsPaid(invoice.id, invoice.invoice_number)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง {filteredInvoices.length} รายการ
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.canDelete ? "ยืนยันการลบ" : "ไม่สามารถลบได้"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {deleteDialog.canDelete ? (
                  <>ต้องการลบใบแจ้งหนี้ &quot;{deleteDialog.number}&quot; หรือไม่?</>
                ) : (
                  <>
                    <span className="text-destructive font-medium block mb-2">ไม่สามารถลบใบแจ้งหนี้ &quot;{deleteDialog.number}&quot; ได้</span>
                    <span className="text-sm text-muted-foreground">
                      ใบแจ้งหนี้ที่ออกแล้วไม่สามารถลบได้
                    </span>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {deleteDialog.canDelete ? (
              <>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  ยืนยันลบ
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogCancel>ปิด</AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BillingInvoiceRow({
  id,
  number,
  customer,
  issueDate,
  dueDate,
  amount,
  status,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
  onPreview,
  onDuplicate,
  onPrint,
  onMarkAsPaid,
}: {
  id: string;
  number: string;
  customer: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onPrint: () => void;
  onMarkAsPaid: () => void;
}) {
  const statusConfig = {
    draft: { label: "ร่าง", color: "bg-yellow-100 text-yellow-700" },
    issued: { label: "ออกแล้ว", color: "bg-blue-100 text-blue-700" },
    paid: { label: "ชำระแล้ว", color: "bg-green-100 text-green-700" },
    overdue: { label: "เกินกำหนด", color: "bg-red-100 text-red-700" },
    cancelled: { label: "ยกเลิก", color: "bg-gray-100 text-gray-700" },
  };

  const { label, color } = statusConfig[status] || statusConfig.draft;

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
      </td>
      <td className="p-4">
        <button
          onClick={onEdit}
          className="font-medium text-primary hover:underline cursor-pointer text-left"
        >
          {number}
        </button>
      </td>
      <td className="p-4">{customer || "-"}</td>
      <td className="p-4 text-muted-foreground">{issueDate}</td>
      <td className="p-4 text-muted-foreground">{dueDate}</td>
      <td className="p-4 text-right font-medium">{amount}</td>
      <td className="p-4">
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${color}`}>
          {label}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreview}
            title="ดูตัวอย่าง"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            title="แก้ไข"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === "issued" && (
                <DropdownMenuItem onClick={onMarkAsPaid} className="gap-2 cursor-pointer text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  บันทึกชำระแล้ว
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onPrint} className="gap-2 cursor-pointer">
                <Printer className="h-4 w-4" />
                พิมพ์
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="gap-2 cursor-pointer">
                <Copy className="h-4 w-4" />
                คัดลอก
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                ลบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
