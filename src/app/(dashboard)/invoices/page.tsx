"use client";

import { useEffect, useState } from "react";
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
  Download,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { formatCurrency } from "@/lib/utils";

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelFilter = searchParams.get("channel");
  const { invoices, fetchInvoices, deleteInvoice, isLoading } = useInvoiceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    number: string;
    canDelete: boolean;
  }>({ open: false, id: "", number: "", canDelete: true });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean;
    deletableIds: string[];
    nonDeletableCount: number;
  }>({ open: false, deletableIds: [], nonDeletableCount: 0 });

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter((inv) => {
    // Filter by search term
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by channel if specified
    const matchesChannel = !channelFilter ||
      (inv.sales_channel?.toLowerCase() === channelFilter.toLowerCase()) ||
      (channelFilter === "other" && (!inv.sales_channel || !["shopee", "lazada", "facebook", "tiktok", "line"].includes(inv.sales_channel.toLowerCase())));

    return matchesSearch && matchesChannel;
  });

  const handleDeleteClick = (id: string, number: string, status: string) => {
    // เฉพาะ draft เท่านั้นที่ลบได้
    const canDelete = status === "draft";
    setDeleteDialog({ open: true, id, number, canDelete });
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.canDelete) {
      await deleteInvoice(deleteDialog.id);
    }
    setDeleteDialog({ open: false, id: "", number: "", canDelete: true });
  };

  const handlePrint = (id: string) => {
    window.open(`/invoices/${id}/preview?print=true`, '_blank');
  };

  const handleDuplicate = (id: string) => {
    router.push(`/invoices/new?duplicate=${id}`);
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

  const handlePrintSelected = () => {
    if (selectedIds.length === 0) return;
    // เปิดหน้าพิมพ์รวมทุกรายการที่เลือก
    router.push(`/invoices/print?ids=${selectedIds.join(",")}`);
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length === 0) return;
    // เปิดหน้า preview รวมสำหรับดาวน์โหลด PDF
    router.push(`/invoices/print?ids=${selectedIds.join(",")}`);
  };

  const handleDeleteSelectedClick = () => {
    if (selectedIds.length === 0) return;

    // แยกรายการที่ลบได้ (draft) และลบไม่ได้
    const selectedInvoices = invoices.filter((inv) => selectedIds.includes(inv.id));
    const deletableIds = selectedInvoices
      .filter((inv) => inv.status === "draft")
      .map((inv) => inv.id);
    const nonDeletableCount = selectedIds.length - deletableIds.length;

    setBulkDeleteDialog({ open: true, deletableIds, nonDeletableCount });
  };

  const handleConfirmBulkDelete = async () => {
    // ลบทีละรายการ
    for (const id of bulkDeleteDialog.deletableIds) {
      await deleteInvoice(id);
    }
    // เคลียร์ selection
    setSelectedIds([]);
    setBulkDeleteDialog({ open: false, deletableIds: [], nonDeletableCount: 0 });
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
      <Header title="ใบกำกับภาษี" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาใบกำกับภาษี..."
                className="w-80 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {channelFilter && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">กรองตาม:</span>
                <ChannelFilterBadge channel={channelFilter} onClear={() => router.push("/invoices")} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/invoices/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                สร้างใบกำกับภาษี
              </Button>
            </Link>
            {selectedIds.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    ดำเนินการ ({selectedIds.length})
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handlePrintSelected} className="gap-2 cursor-pointer">
                    <Printer className="h-4 w-4" />
                    พิมพ์ที่เลือก
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadSelected} className="gap-2 cursor-pointer">
                    <Download className="h-4 w-4" />
                    ดาวน์โหลด PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDeleteSelectedClick}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    ลบที่เลือก
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                <th className="text-left p-4 font-medium w-28">ช่องทาง</th>
                <th className="text-right p-4 font-medium">จำนวนเงิน</th>
                <th className="text-left p-4 font-medium">สถานะ</th>
                <th className="text-center p-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>ยังไม่มีใบกำกับภาษี</p>
                    <p className="text-sm">กดปุ่ม "สร้างใบกำกับภาษี" เพื่อเริ่มต้น</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice.id}
                    id={invoice.id}
                    number={invoice.invoice_number}
                    customer={invoice.customer_name}
                    date={formatDate(invoice.issue_date)}
                    dueDate={formatDate(invoice.due_date)}
                    salesChannel={invoice.sales_channel}
                    amount={formatCurrency(invoice.total_amount || 0)}
                    status={invoice.status as any || "draft"}
                    isSelected={selectedIds.includes(invoice.id)}
                    onSelect={(checked) => handleSelectOne(invoice.id, checked)}
                    onDelete={() => handleDeleteClick(invoice.id, invoice.invoice_number, invoice.status || "draft")}
                    onEdit={() => router.push(`/invoices/${invoice.id}/edit`)}
                    onPreview={() => router.push(`/invoices/${invoice.id}/preview`)}
                    onDuplicate={() => handleDuplicate(invoice.id)}
                    onPrint={() => handlePrint(invoice.id)}
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              ก่อนหน้า
            </Button>
            <Button variant="outline" size="sm" disabled>
              ถัดไป
            </Button>
          </div>
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
                  <>ต้องการลบใบกำกับภาษี &quot;{deleteDialog.number}&quot; หรือไม่?</>
                ) : (
                  <>
                    <span className="text-destructive font-medium block mb-2">ไม่สามารถลบใบกำกับภาษี &quot;{deleteDialog.number}&quot; ได้</span>
                    <span className="text-sm text-muted-foreground">
                      ใบกำกับภาษีที่ออกแล้วไม่สามารถลบได้ตามหลักกฎหมายภาษี
                      หากต้องการยกเลิก กรุณาไปที่หน้าพรีวิวเอกสารแล้วกดปุ่ม &quot;ยกเลิกใบกำกับภาษี&quot;
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
              <>
                <AlertDialogCancel>ปิด</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setDeleteDialog(prev => ({ ...prev, open: false }));
                    router.push(`/invoices/${deleteDialog.id}/preview`);
                  }}
                >
                  ไปหน้าพรีวิว
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialog.open} onOpenChange={(open) => setBulkDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบหลายรายการ</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {bulkDeleteDialog.deletableIds.length > 0 ? (
                  <p>ต้องการลบใบกำกับภาษี {bulkDeleteDialog.deletableIds.length} รายการ หรือไม่?</p>
                ) : (
                  <p className="text-destructive font-medium">ไม่มีรายการที่สามารถลบได้</p>
                )}
                {bulkDeleteDialog.nonDeletableCount > 0 && (
                  <p className="text-sm text-orange-600">
                    * มี {bulkDeleteDialog.nonDeletableCount} รายการที่ไม่สามารถลบได้ (เฉพาะร่างเท่านั้นที่ลบได้)
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            {bulkDeleteDialog.deletableIds.length > 0 && (
              <AlertDialogAction
                onClick={handleConfirmBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                ยืนยันลบ {bulkDeleteDialog.deletableIds.length} รายการ
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InvoiceRow({
  id,
  number,
  customer,
  date,
  dueDate,
  salesChannel,
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
  dueDate: string;
  salesChannel: string | null;
  amount: string;
  status: "draft" | "pending" | "issued" | "sent" | "partial" | "paid" | "overdue" | "cancelled";
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
    pending: { label: "รอดำเนินการ", color: "bg-blue-100 text-blue-700" },
    issued: { label: "ออกแล้ว", color: "bg-green-100 text-green-700" },
    sent: { label: "ส่งแล้ว", color: "bg-green-100 text-green-700" },
    partial: { label: "ชำระบางส่วน", color: "bg-orange-100 text-orange-700" },
    paid: { label: "ชำระแล้ว", color: "bg-green-100 text-green-700" },
    overdue: { label: "เลยกำหนด", color: "bg-orange-100 text-orange-700" },
    cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-700" },
  };

  const { label, color } = statusConfig[status] || statusConfig.draft;

  // Sales channel color config
  const salesChannelConfig: Record<string, { label: string; color: string }> = {
    shopee: { label: "Shopee", color: "bg-orange-500" },
    lazada: { label: "Lazada", color: "bg-purple-600" },
    facebook: { label: "Facebook", color: "bg-blue-500" },
    tiktok: { label: "TikTok", color: "bg-black" },
    line: { label: "Line", color: "bg-green-500" },
  };

  const getSalesChannelDisplay = () => {
    if (!salesChannel) return "-";
    const config = salesChannelConfig[salesChannel.toLowerCase()];
    if (config) {
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-white text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      );
    }
    return <span className="inline-block px-2 py-0.5 rounded text-white text-xs font-medium bg-gray-400">{salesChannel}</span>;
  };

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
      <td className="p-4 text-muted-foreground">{dueDate}</td>
      <td className="p-4 text-muted-foreground whitespace-nowrap">{getSalesChannelDisplay()}</td>
      <td className="p-4 text-right font-medium">{amount}</td>
      <td className="p-4">
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${color}`}>
          {label}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPreview} title="พรีวิว">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="แก้ไข">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="คัดลอก">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrint} title="พิมพ์">
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="ลบ"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ChannelFilterBadge({
  channel,
  onClear,
}: {
  channel: string;
  onClear: () => void;
}) {
  const channelConfig: Record<string, { label: string; color: string }> = {
    shopee: { label: "Shopee", color: "bg-orange-500" },
    lazada: { label: "Lazada", color: "bg-purple-600" },
    facebook: { label: "Facebook", color: "bg-blue-500" },
    tiktok: { label: "TikTok", color: "bg-black" },
    line: { label: "Line", color: "bg-green-500" },
    other: { label: "อื่นๆ", color: "bg-gray-400" },
  };

  const config = channelConfig[channel.toLowerCase()] || channelConfig.other;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-white text-sm font-medium ${config.color}`}>
      {config.label}
      <button onClick={onClear} className="hover:bg-white/20 rounded p-0.5">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
