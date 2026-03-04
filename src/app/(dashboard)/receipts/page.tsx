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
  ChevronDown,
  Printer,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReceiptStore } from "@/stores/receiptStore";
import { formatCurrency } from "@/lib/utils";

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<ReceiptsPageLoading />}>
      <ReceiptsPageContent />
    </Suspense>
  );
}

function ReceiptsPageLoading() {
  return (
    <div>
      <Header title="ใบเสร็จรับเงิน" />
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </div>
  );
}

function ReceiptsPageContent() {
  const router = useRouter();
  const { receipts, fetchReceipts, deleteReceipt, isLoading } = useReceiptStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    number: string;
    canDelete: boolean;
  }>({ open: false, id: "", number: "", canDelete: true });

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const filteredReceipts = receipts.filter((rec) => {
    const matchesSearch =
      rec.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteClick = (id: string, number: string, status: string) => {
    const canDelete = status === "draft";
    setDeleteDialog({ open: true, id, number, canDelete });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.canDelete) {
      await deleteReceipt(deleteDialog.id);
    }
    setDeleteDialog({ open: false, id: "", number: "", canDelete: true });
  };

  const handlePrint = (id: string) => {
    window.open(`/receipts/${id}/preview?print=true`, '_blank');
  };

  const handleDuplicate = (id: string) => {
    router.push(`/receipts/new?duplicate=${id}`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredReceipts.map((rec) => rec.id));
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
      <Header title="ใบเสร็จรับเงิน" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาใบเสร็จ..."
                className="w-80 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/receipts/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                สร้างใบเสร็จรับเงิน
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
                    checked={filteredReceipts.length > 0 && selectedIds.length === filteredReceipts.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 font-medium">เลขที่</th>
                <th className="text-left p-4 font-medium">ลูกค้า</th>
                <th className="text-left p-4 font-medium">วันที่ออก</th>
                <th className="text-left p-4 font-medium">วิธีชำระ</th>
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
              ) : filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>ยังไม่มีใบเสร็จรับเงิน</p>
                    <p className="text-sm">กดปุ่ม &quot;สร้างใบเสร็จรับเงิน&quot; เพื่อเริ่มต้น</p>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => (
                  <ReceiptRow
                    key={receipt.id}
                    id={receipt.id}
                    number={receipt.receipt_number}
                    customer={receipt.customer_name}
                    date={formatDate(receipt.issue_date)}
                    paymentMethod={receipt.payment_method}
                    amount={formatCurrency(receipt.total_amount || 0)}
                    status={receipt.status as any || "draft"}
                    isSelected={selectedIds.includes(receipt.id)}
                    onSelect={(checked) => handleSelectOne(receipt.id, checked)}
                    onDelete={() => handleDeleteClick(receipt.id, receipt.receipt_number, receipt.status || "draft")}
                    onEdit={() => router.push(`/receipts/${receipt.id}/edit`)}
                    onPreview={() => router.push(`/receipts/${receipt.id}/preview`)}
                    onDuplicate={() => handleDuplicate(receipt.id)}
                    onPrint={() => handlePrint(receipt.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง {filteredReceipts.length} รายการ
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
                  <>ต้องการลบใบเสร็จ &quot;{deleteDialog.number}&quot; หรือไม่?</>
                ) : (
                  <>
                    <span className="text-destructive font-medium block mb-2">ไม่สามารถลบใบเสร็จ &quot;{deleteDialog.number}&quot; ได้</span>
                    <span className="text-sm text-muted-foreground">
                      ใบเสร็จที่ออกแล้วไม่สามารถลบได้
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

function ReceiptRow({
  id,
  number,
  customer,
  date,
  paymentMethod,
  amount,
  status,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
  onPreview,
  onDuplicate,
  onPrint,
}: {
  id: string;
  number: string;
  customer: string;
  date: string;
  paymentMethod: string;
  amount: string;
  status: "draft" | "issued" | "cancelled";
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onPrint: () => void;
}) {
  const statusConfig = {
    draft: { label: "ร่าง", color: "bg-yellow-100 text-yellow-700" },
    issued: { label: "ออกแล้ว", color: "bg-green-100 text-green-700" },
    cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700" },
  };

  const paymentMethodConfig: Record<string, string> = {
    cash: "เงินสด",
    transfer: "โอนเงิน",
    credit_card: "บัตรเครดิต",
    qr_code: "QR Code",
    check: "เช็ค",
    other: "อื่นๆ",
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
      <td className="p-4 text-muted-foreground">{date}</td>
      <td className="p-4 text-muted-foreground">{paymentMethodConfig[paymentMethod] || paymentMethod || "-"}</td>
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
