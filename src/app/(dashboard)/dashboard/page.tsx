import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Receipt,
  Users,
  TrendingUp,
  Plus,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <Header title="แดชบอร์ด" />

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex items-center gap-4">
          <Link href="/quotations/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างใบเสนอราคา
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              สร้างใบกำกับภาษี
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="ใบเสนอราคาเดือนนี้"
            value="12"
            change="+20%"
            icon={<FileText className="h-5 w-5" />}
            trend="up"
          />
          <StatsCard
            title="ใบกำกับภาษีเดือนนี้"
            value="8"
            change="+15%"
            icon={<Receipt className="h-5 w-5" />}
            trend="up"
          />
          <StatsCard
            title="ลูกค้าทั้งหมด"
            value="45"
            change="+5"
            icon={<Users className="h-5 w-5" />}
            trend="up"
          />
          <StatsCard
            title="รายได้เดือนนี้"
            value="฿125,000"
            change="+12%"
            icon={<TrendingUp className="h-5 w-5" />}
            trend="up"
          />
        </div>

        {/* Recent Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Quotations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">ใบเสนอราคาล่าสุด</CardTitle>
              <Link href="/quotations">
                <Button variant="ghost" size="sm" className="gap-1">
                  ดูทั้งหมด
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <DocumentRow
                  number="QT2024-00012"
                  customer="บริษัท ABC จำกัด"
                  amount="฿45,000"
                  status="รออนุมัติ"
                  statusColor="yellow"
                />
                <DocumentRow
                  number="QT2024-00011"
                  customer="บริษัท XYZ จำกัด"
                  amount="฿32,500"
                  status="อนุมัติแล้ว"
                  statusColor="green"
                />
                <DocumentRow
                  number="QT2024-00010"
                  customer="คุณสมชาย ใจดี"
                  amount="฿15,000"
                  status="ร่าง"
                  statusColor="gray"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">ใบกำกับภาษีล่าสุด</CardTitle>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="gap-1">
                  ดูทั้งหมด
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <DocumentRow
                  number="IV2024-00008"
                  customer="บริษัท ABC จำกัด"
                  amount="฿45,000"
                  status="ชำระแล้ว"
                  statusColor="green"
                />
                <DocumentRow
                  number="IV2024-00007"
                  customer="บริษัท DEF จำกัด"
                  amount="฿28,000"
                  status="รอชำระ"
                  statusColor="yellow"
                />
                <DocumentRow
                  number="IV2024-00006"
                  customer="บริษัท GHI จำกัด"
                  amount="฿65,000"
                  status="เลยกำหนด"
                  statusColor="red"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              รายการที่ต้องติดตาม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <TaskItem
                type="quotation"
                title="ใบเสนอราคา QT2024-00010 รอการส่ง"
                date="2 วันที่แล้ว"
              />
              <TaskItem
                type="invoice"
                title="ใบกำกับภาษี IV2024-00006 เลยกำหนดชำระ"
                date="5 วันที่แล้ว"
              />
              <TaskItem
                type="quotation"
                title="ใบเสนอราคา QT2024-00008 จะหมดอายุใน 3 วัน"
                date="สร้างเมื่อ 27 วันที่แล้ว"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p
              className={`text-sm mt-1 ${
                trend === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              {change} จากเดือนที่แล้ว
            </p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  number,
  customer,
  amount,
  status,
  statusColor,
}: {
  number: string;
  customer: string;
  amount: string;
  status: string;
  statusColor: "green" | "yellow" | "red" | "gray";
}) {
  const colors = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium">{number}</p>
        <p className="text-sm text-muted-foreground">{customer}</p>
      </div>
      <div className="text-right">
        <p className="font-medium">{amount}</p>
        <span
          className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[statusColor]}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function TaskItem({
  type,
  title,
  date,
}: {
  type: "quotation" | "invoice";
  title: string;
  date: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div
        className={`p-2 rounded-lg ${
          type === "quotation"
            ? "bg-blue-100 text-blue-700"
            : "bg-purple-100 text-purple-700"
        }`}
      >
        {type === "quotation" ? (
          <FileText className="h-4 w-4" />
        ) : (
          <Receipt className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{date}</p>
      </div>
      <Button variant="outline" size="sm">
        ดู
      </Button>
    </div>
  );
}
