import Link from "next/link";
import { FileText, Receipt, Sparkles, Users, Package } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Auto Bill</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              เริ่มใช้งานฟรี
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            ใช้ AI แยกข้อมูลอัตโนมัติ
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            ออกใบเสนอราคาและใบกำกับภาษี
            <br />
            <span className="text-primary">ง่ายและรวดเร็ว</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            แค่วางข้อความหรืออัปโหลดรูปภาพ ระบบจะแยกข้อมูลสินค้าและบริการให้อัตโนมัติ
            สร้างเอกสารได้ในไม่กี่คลิก
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-base font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              เริ่มใช้งานฟรี
            </Link>
            <Link
              href="#features"
              className="px-6 py-3 text-base font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ดูฟีเจอร์ทั้งหมด
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="AI แยกข้อมูลอัตโนมัติ"
            description="วางข้อความหรืออัปโหลดรูป ระบบจะแยกรายการสินค้าให้อัตโนมัติ"
          />
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            title="ใบเสนอราคา"
            description="สร้างใบเสนอราคาอย่างมืออาชีพ ส่งให้ลูกค้าได้ทันที"
          />
          <FeatureCard
            icon={<Receipt className="w-6 h-6" />}
            title="ใบกำกับภาษี"
            description="ออกใบกำกับภาษีได้ง่าย ถูกต้องตามกฎหมาย"
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="จัดการลูกค้า"
            description="เก็บข้อมูลลูกค้าไว้ใช้งานซ้ำได้ทุกเมื่อ"
          />
        </div>

        {/* How it works */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">วิธีการใช้งาน</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              title="วางข้อความหรือรูป"
              description="วางรายการสินค้าจากที่ไหนก็ได้ หรืออัปโหลดรูปใบเสนอราคา"
            />
            <StepCard
              step={2}
              title="AI แยกข้อมูล"
              description="ระบบจะแยกรายละเอียด จำนวน และราคาให้อัตโนมัติ"
            />
            <StepCard
              step={3}
              title="ส่งเอกสาร"
              description="ตรวจสอบและส่งใบเสนอราคาหรือใบกำกับภาษีให้ลูกค้า"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-24">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2024 Auto Bill. สร้างด้วย Next.js และ Claude AI</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
