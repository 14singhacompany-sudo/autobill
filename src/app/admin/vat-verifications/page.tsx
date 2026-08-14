"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, FileCheck2, Loader2, RefreshCw, XCircle } from "lucide-react";

interface VatRecord {
  id: string;
  company_name: string;
  email: string;
  tax_id: string;
  branch_code: string;
  branch_name: string;
  address: string;
  phone: string;
  entity_type: string;
  vat_registration_date: string | null;
  vat_verification_status: string;
  vat_submitted_at: string | null;
  vat_rejection_reason: string | null;
  document_url: string | null;
}

const entityLabels: Record<string, string> = {
  individual: "บุคคลธรรมดา",
  juristic: "นิติบุคคล",
  partnership: "ห้างหุ้นส่วน/คณะบุคคล",
};

export default function VatVerificationsPage() {
  const searchParams = useSearchParams();
  const selectedCompanyId = searchParams.get("company");
  const [records, setRecords] = useState<VatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/vat-verifications");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ");
      setRecords(result.records || []);
    } catch (error) {
      toast({ title: "โหลดข้อมูลไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && selectedCompanyId) {
      document.getElementById(`vat-record-${selectedCompanyId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, records, selectedCompanyId]);

  const visibleRecords = selectedCompanyId
    ? records.filter((record) => record.id === selectedCompanyId)
    : records;

  const decide = async (record: VatRecord, decision: "verified" | "rejected") => {
    if (decision === "verified" && !window.confirm(`ยืนยัน ภ.พ.20 ของ ${record.company_name}?`)) return;
    setWorkingId(record.id);
    try {
      const response = await fetch("/api/admin/vat-verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_settings_id: record.id, decision, reason: reasons[record.id] || "" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกไม่สำเร็จ");
      toast({ title: decision === "verified" ? "อนุมัติแล้ว" : "ไม่อนุมัติแล้ว" });
      await load();
    } catch (error) {
      toast({ title: "บันทึกไม่สำเร็จ", description: error instanceof Error ? error.message : "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally { setWorkingId(null); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">ตรวจสอบ ภ.พ.20</h1><p className="text-muted-foreground">ตรวจหลักฐานก่อนเปิดสิทธิ์ออกใบกำกับภาษี</p></div><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />รีเฟรช</Button></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />{selectedCompanyId ? "เอกสารที่เลือก" : `รายการ (${records.length})`}</CardTitle></CardHeader><CardContent className="space-y-4">
      {visibleRecords.length === 0 && <p className="py-8 text-center text-muted-foreground">ไม่พบรายการ ภ.พ.20 ที่เลือก</p>}
      {visibleRecords.map((record) => <div id={`vat-record-${record.id}`} key={record.id} className={`rounded-lg border p-4 ${selectedCompanyId === record.id ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : ""}`}>
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(480px,1.4fr)]">
          <div className="space-y-1 text-sm lg:sticky lg:top-4 lg:self-start">
            <p className="text-base font-semibold">{record.company_name}</p>
            <p><span className="text-muted-foreground">ประเภท:</span> {entityLabels[record.entity_type] || "-"}</p>
            <p><span className="text-muted-foreground">เลขผู้เสียภาษี:</span> {record.tax_id || "-"}</p>
            <p><span className="text-muted-foreground">สาขา:</span> {record.branch_code || "00000"} {record.branch_name || ""}</p>
            <p><span className="text-muted-foreground">ที่อยู่:</span> {record.address || "-"}</p>
            <p><span className="text-muted-foreground">วันที่จด VAT:</span> {record.vat_registration_date || "-"}</p>
            <p><span className="text-muted-foreground">บัญชีผู้ใช้:</span> {record.email}</p>
            <p><span className="text-muted-foreground">เบอร์โทร:</span> {record.phone || "-"}</p>
            <p><span className="text-muted-foreground">ส่งเอกสารเมื่อ:</span> {record.vat_submitted_at ? new Date(record.vat_submitted_at).toLocaleString("th-TH") : "-"}</p>
            <span className={`inline-block rounded-full px-2 py-1 text-xs ${record.vat_verification_status === "verified" ? "bg-green-100 text-green-700" : record.vat_verification_status === "pending" ? "bg-amber-100 text-amber-700" : record.vat_verification_status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100"}`}>{record.vat_verification_status}</span>
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            {record.document_url ? (
              <div className="overflow-hidden rounded-lg border bg-white">
                <div className="border-b bg-muted/50 px-3 py-2 text-sm font-medium">เอกสาร ภ.พ.20 ที่ผู้ใช้ส่ง</div>
                <iframe
                  src={record.document_url}
                  title={`ภ.พ.20 ของ ${record.company_name}`}
                  className="h-[520px] w-full bg-white md:h-[680px]"
                />
              </div>
            ) : <p className="text-sm text-red-600">ยังไม่ส่งเอกสาร</p>}
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">ก่อนอนุมัติ ให้เทียบชื่อกิจการ เลขผู้เสียภาษี สาขา ที่อยู่ และวันที่จด VAT กับ ภ.พ.20 ทุกช่อง</p>
            <Input placeholder="เหตุผลกรณีไม่อนุมัติ" value={reasons[record.id] || ""} onChange={(e) => setReasons({ ...reasons, [record.id]: e.target.value })} />
            <div className="flex gap-2"><Button className="flex-1" disabled={workingId === record.id || !record.document_url} onClick={() => decide(record, "verified")}><CheckCircle2 className="mr-2 h-4 w-4" />อนุมัติ</Button><Button className="flex-1" variant="destructive" disabled={workingId === record.id || !record.document_url} onClick={() => decide(record, "rejected")}><XCircle className="mr-2 h-4 w-4" />ไม่อนุมัติ</Button></div>
          </div>
        </div>
      </div>)}
    </CardContent></Card>
  </div>;
}
