"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, User, Building2, Loader2 } from "lucide-react";
import { useCustomerStore } from "@/stores/customerStore";
import type { Customer } from "@/types/database";

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
}

export function CustomerSearch({ onSelect }: CustomerSearchProps) {
  const { customers, fetchCustomers, isLoading } = useCustomerStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      fetchCustomers();
    }
  }, [isOpen, customers.length, fetchCustomers]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tax_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        ค้นหาลูกค้า
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>ค้นหาลูกค้า</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, เลขประจำตัวผู้เสียภาษี, เบอร์โทร..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Customer List */}
            <div className="max-h-[400px] overflow-y-auto border rounded-lg divide-y">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>กำลังโหลด...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>ไม่พบลูกค้า</p>
                  <p className="text-sm">
                    {search
                      ? "ลองค้นหาด้วยคำอื่น"
                      : "ยังไม่มีข้อมูลลูกค้าในระบบ"}
                  </p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelect(customer)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded ${
                          customer.customer_type === "individual"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {customer.customer_type === "individual" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{customer.name}</p>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {customer.tax_id && (
                            <p>
                              เลขผู้เสียภาษี: {customer.tax_id}
                              {customer.branch_code &&
                                customer.branch_code !== "00000" &&
                                ` (สาขา ${customer.branch_code})`}
                              {customer.branch_code === "00000" && " (สำนักงานใหญ่)"}
                            </p>
                          )}
                          {customer.address && (
                            <p className="truncate">{customer.address}</p>
                          )}
                          <div className="flex gap-4 text-xs">
                            {customer.contact_name && (
                              <span>ผู้ติดต่อ: {customer.contact_name}</span>
                            )}
                            {customer.phone && <span>โทร: {customer.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              เลือกลูกค้าเพื่อนำข้อมูลมากรอกในฟอร์ม
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
