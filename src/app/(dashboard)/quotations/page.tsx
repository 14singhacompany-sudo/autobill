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
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Copy,
  ChevronDown,
  Printer,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuotationStore } from "@/stores/quotationStore";
import { formatCurrency } from "@/lib/utils";

export default function QuotationsPage() {
  const router = useRouter();
  const { quotations, fetchQuotations, deleteQuotation, isLoading } = useQuotationStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const filteredQuotations = quotations.filter(
    (qt) =>
      qt.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qt.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, number: string) => {
    if (confirm(`ต้องการลบ "${number}" หรือไม่?`)) {
      await deleteQuotation(id);
    }
  };

  const handlePrint = (id: string) => {
    window.open(`/quotations/${id}/preview?print=true`, '_blank');
  };

  const handleDuplicate = (id: string) => {
    router.push(`/quotations/new?duplicate=${id}`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredQuotations.map((qt) => qt.id));
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
    router.push(`/quotations/print?ids=${selectedIds.join(",")}`);
  };

  const handleDownloadSelected = () => {
    if (selectedIds.length === 0) return;
    // เปิดหน้า preview รวมสำหรับดาวน์โหลด PDF
    router.push(`/quotations/print?ids=${selectedIds.join(",")}`);
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
      <Header title="ใบเสนอราคา" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาใบเสนอราคา..."
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
          <div className="flex items-center gap-2">
            <Link href="/quotations/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                สร้างใบเสนอราคา
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
                    checked={filteredQuotations.length > 0 && selectedIds.length === filteredQuotations.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-4 font-medium">เลขที่</th>
                <th className="text-left p-4 font-medium">ลูกค้า</th>
                <th className="text-left p-4 font-medium">วันที่</th>
                <th className="text-left p-4 font-medium">ใช้ได้ถึง</th>
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
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>ยังไม่มีใบเสนอราคา</p>
                    <p className="text-sm">กดปุ่ม "สร้างใบเสนอราคา" เพื่อเริ่มต้น</p>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quotation) => (
                  <QuotationRow
                    key={quotation.id}
                    id={quotation.id}
                    number={quotation.quotation_number}
                    customer={quotation.customer_name}
                    date={formatDate(quotation.issue_date)}
                    validUntil={formatDate(quotation.valid_until)}
                    amount={formatCurrency(quotation.total_amount || 0)}
                    status={quotation.status as any || "draft"}
                    isSelected={selectedIds.includes(quotation.id)}
                    onSelect={(checked) => handleSelectOne(quotation.id, checked)}
                    onDelete={() => handleDelete(quotation.id, quotation.quotation_number)}
                    onEdit={() => router.push(`/quotations/${quotation.id}/edit`)}
                    onPreview={() => router.push(`/quotations/${quotation.id}/preview`)}
                    onDuplicate={() => handleDuplicate(quotation.id)}
                    onPrint={() => handlePrint(quotation.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง {filteredQuotations.length} รายการ
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
    </div>
  );
}

function QuotationRow({
  id,
  number,
  customer,
  date,
  validUntil,
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
  validUntil: string;
  amount: string;
  status: "draft" | "pending" | "approved" | "rejected" | "expired" | "converted";
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onPrint: () => void;
}) {
  const statusConfig = {
    draft: { label: "ร่าง", color: "bg-gray-100 text-gray-700" },
    pending: { label: "รออนุมัติ", color: "bg-yellow-100 text-yellow-700" },
    approved: { label: "อนุมัติแล้ว", color: "bg-green-100 text-green-700" },
    rejected: { label: "ปฏิเสธ", color: "bg-red-100 text-red-700" },
    expired: { label: "หมดอายุ", color: "bg-gray-100 text-gray-500" },
    converted: { label: "ออกใบกำกับแล้ว", color: "bg-blue-100 text-blue-700" },
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
      <td className="p-4 text-muted-foreground">{validUntil}</td>
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
