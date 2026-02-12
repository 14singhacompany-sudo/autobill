import Link from "next/link";
import {
  FileText,
  Receipt,
  Sparkles,
  Users,
  Package,
  Check,
  ShoppingBag,
  TrendingUp,
  Shield,
  Zap,
  Camera,
  MessageSquare,
  BarChart3,
  Mail,
  Printer,
  CreditCard,
  Star,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AutoBill24
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              ฟีเจอร์
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              วิธีใช้งาน
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              ราคา
            </a>
            <a href="#channels" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              ช่องทางขาย
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              ทดลองฟรี 14 วัน
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-blue-50 via-white to-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-sm font-medium mb-6 border border-blue-200/50">
              <Sparkles className="w-4 h-4" />
              ใหม่! AI ดึงข้อมูลลูกค้าจากนามบัตรหรือข้อความอัตโนมัติ
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              ออกบิลง่าย รวดเร็ว
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ด้วยพลัง AI
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              ระบบออกใบเสนอราคาและใบกำกับภาษีอัตโนมัติ สำหรับ SME และ Freelancer
              <br className="hidden md:block" />
              ถ่ายรูปนามบัตรหรือวางข้อความ AI ดึงข้อมูลลูกค้าให้ทันที
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                เริ่มใช้งานฟรี
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                ดูวิธีใช้งาน
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                ทดลองฟรี 14 วัน
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                ดาวน์โหลด PDF ได้ทันที
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                เก็บประวัติเอกสารไม่มีหาย
              </div>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden mx-auto max-w-5xl border border-gray-700">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-gray-400 text-sm">autobill24.com/dashboard</span>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <StatCard title="ใบเสนอราคาเดือนนี้" value="24" change="+12%" />
                  <StatCard title="ใบกำกับภาษีเดือนนี้" value="18" change="+8%" />
                  <StatCard title="ลูกค้าทั้งหมด" value="156" change="" />
                  <StatCard title="รายได้เดือนนี้" value="฿128,450" change="+15%" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">ใบเสนอราคาล่าสุด</h4>
                    <div className="space-y-2">
                      <DocumentRow number="QT-2024-0024" customer="บริษัท ABC จำกัด" amount="฿45,000" status="รออนุมัติ" />
                      <DocumentRow number="QT-2024-0023" customer="ร้าน XYZ" amount="฿12,500" status="อนุมัติแล้ว" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">ยอดขายตามช่องทาง</h4>
                    <div className="space-y-2">
                      <ChannelBar name="Shopee" amount="฿45,200" percent={40} color="bg-orange-500" />
                      <ChannelBar name="Lazada" amount="฿32,100" percent={28} color="bg-purple-600" />
                      <ChannelBar name="Facebook" amount="฿28,500" percent={25} color="bg-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Feature Highlight */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                ขับเคลื่อนด้วย Claude AI
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                ดึงข้อมูลลูกค้าด้วย AI
              </h2>
              <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                ถ่ายรูปนามบัตรหรือวางข้อความ ระบบ AI จะดึงข้อมูลลูกค้า ชื่อบริษัท ที่อยู่ เลขประจำตัวผู้เสียภาษี
                ให้อัตโนมัติ ไม่ต้องพิมพ์เอง ประหยัดเวลา
              </p>
              <div className="space-y-4">
                <AIFeatureItem icon={<Camera />} text="ถ่ายรูปนามบัตร ดึงข้อมูลลูกค้าอัตโนมัติ" />
                <AIFeatureItem icon={<MessageSquare />} text="วางข้อความ ดึงชื่อ ที่อยู่ เลขภาษีได้เลย" />
                <AIFeatureItem icon={<Users />} text="บันทึกข้อมูลลูกค้าไว้ใช้ซ้ำได้ตลอด" />
                <AIFeatureItem icon={<Shield />} text="ตรวจสอบเลขประจำตัวผู้เสียภาษี 13 หลักอัตโนมัติ" />
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Camera className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">ถ่ายรูปนามบัตร</h4>
                    <p className="text-sm text-gray-500">หรือวางข้อความข้อมูลลูกค้า</p>
                  </div>
                </div>
                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 text-left text-sm text-gray-600">
                  <p className="font-medium mb-1">บริษัท ABC จำกัด</p>
                  <p className="mb-1">123/45 ถ.สุขุมวิท แขวงคลองเตย</p>
                  <p className="mb-1">เขตคลองเตย กรุงเทพฯ 10110</p>
                  <p>เลขภาษี: 0105548123456</p>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <Sparkles className="w-4 h-4" />
                    AI ดึงข้อมูลลูกค้าสำเร็จ
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>✓ ชื่อบริษัท: บริษัท ABC จำกัด</p>
                    <p>✓ ที่อยู่: 123/45 ถ.สุขุมวิท...</p>
                    <p>✓ เลขภาษี: 0105548123456</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ครบทุกฟีเจอร์ที่ธุรกิจต้องการ
            </h2>
            <p className="text-lg text-gray-600">
              ออกแบบมาเพื่อ SME และ Freelancer ไทยโดยเฉพาะ
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="ใบเสนอราคา"
              description="สร้างใบเสนอราคาอย่างมืออาชีพ ติดตามสถานะ แปลงเป็นใบกำกับภาษีได้ทันที"
            />
            <FeatureCard
              icon={<Receipt className="w-6 h-6" />}
              title="ใบกำกับภาษี"
              description="ออกใบกำกับภาษีถูกต้องตามกฎหมาย รองรับทุกรูปแบบตามประกาศกรมสรรพากร"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="จัดการลูกค้า"
              description="เก็บข้อมูลลูกค้าไม่จำกัด พร้อมเลขประจำตัวผู้เสียภาษี สาขา และที่อยู่"
            />
            <FeatureCard
              icon={<Package className="w-6 h-6" />}
              title="สินค้าและบริการ"
              description="สร้างรายการสินค้า/บริการไว้ใช้ซ้ำ พร้อมตั้งค่า VAT แต่ละรายการ"
            />
            <FeatureCard
              icon={<Printer className="w-6 h-6" />}
              title="ดาวน์โหลด PDF"
              description="ดาวน์โหลดใบเสนอราคา/ใบกำกับภาษีเป็น PDF พร้อมโลโก้และลายเซ็น เก็บประวัติไว้ไม่มีหาย"
            />
            <FeatureCard
              icon={<Mail className="w-6 h-6" />}
              title="ส่งอีเมล"
              description="ส่งเอกสารให้ลูกค้าทางอีเมลได้โดยตรง พร้อมติดตามสถานะการเปิดอ่าน"
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6" />}
              title="ติดตามการชำระเงิน"
              description="บันทึกการชำระเงิน รองรับชำระบางส่วน แจ้งเตือนเมื่อเลยกำหนด"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="รายงานและสถิติ"
              description="ดูยอดขายรายเดือน วิเคราะห์ตามช่องทาง และติดตามการเติบโต"
            />
            <FeatureCard
              icon={<ShoppingBag className="w-6 h-6" />}
              title="ช่องทางขาย"
              description="แยกยอดขายตาม Shopee, Lazada, Facebook, TikTok, Line และอื่นๆ"
            />
          </div>
        </div>
      </section>

      {/* Sales Channels */}
      <section id="channels" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              รองรับทุกช่องทางขายออนไลน์
            </h2>
            <p className="text-lg text-gray-600">
              ติดตามยอดขายจากทุก Marketplace ในที่เดียว
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <ChannelCard name="Shopee" color="bg-orange-500" />
            <ChannelCard name="Lazada" color="bg-purple-600" />
            <ChannelCard name="Facebook" color="bg-blue-500" />
            <ChannelCard name="TikTok" color="bg-black" />
            <ChannelCard name="Line" color="bg-green-500" />
            <ChannelCard name="อื่นๆ" color="bg-gray-400" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ง่ายแค่ 3 ขั้นตอน
            </h2>
            <p className="text-lg text-gray-600">
              ออกบิลได้ภายในไม่กี่นาที
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

            <StepCard
              step={1}
              title="เพิ่มข้อมูลลูกค้าและสินค้า"
              description="ถ่ายรูปนามบัตรให้ AI ดึงข้อมูลลูกค้า หรือเพิ่มสินค้าด้วยตัวเอง"
              icon={<Users />}
            />
            <StepCard
              step={2}
              title="สร้างใบเสนอราคา/บิล"
              description="เลือกลูกค้า เพิ่มรายการสินค้า ระบบคำนวณ VAT ให้อัตโนมัติ"
              icon={<FileText />}
            />
            <StepCard
              step={3}
              title="ส่งเอกสารให้ลูกค้า"
              description="ตรวจสอบ พิมพ์ PDF หรือส่งอีเมลให้ลูกค้าได้เลย"
              icon={<Mail />}
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ราคาที่คุ้มค่า เหมาะกับทุกธุรกิจ
            </h2>
            <p className="text-lg text-gray-600">
              เริ่มต้นฟรี อัพเกรดเมื่อธุรกิจเติบโต
            </p>
          </div>

          {/* Feature comparison header */}
          <div className="text-center mb-8">
            <p className="text-gray-500 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              ทุกแพ็คเกจใช้ AI ดึงข้อมูลลูกค้าได้ ต่างกันแค่จำนวนบิล
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {/* Free Plan */}
            <PricingCard
              name="FREE"
              price="฿0"
              period="ตลอดชีพ"
              description="เริ่มต้นใช้งาน"
              features={[
                "20 บิล/เดือน",
                "20 ใบเสนอราคา/เดือน",
                "AI ดึงข้อมูลลูกค้า",
                "ดาวน์โหลด PDF",
                "ลูกค้า/สินค้าไม่จำกัด",
                "เก็บข้อมูลบน Cloud",
              ]}
              cta="เริ่มใช้งานฟรี"
              href="/signup"
            />

            {/* Solo Plan */}
            <PricingCard
              name="SOLO"
              price="฿199"
              period="/เดือน"
              description="สำหรับ Freelancer"
              features={[
                "100 บิล/เดือน",
                "100 ใบเสนอราคา/เดือน",
                "AI ดึงข้อมูลลูกค้า",
                "ดาวน์โหลด PDF",
                "ลูกค้า/สินค้าไม่จำกัด",
                "เก็บข้อมูลบน Cloud",
              ]}
              cta="เริ่มทดลองฟรี 14 วัน"
              href="/signup"
            />

            {/* Pro Plan */}
            <PricingCard
              name="PRO"
              price="฿299"
              period="/เดือน"
              description="สำหรับธุรกิจที่เติบโต"
              features={[
                "บิลไม่จำกัด",
                "ใบเสนอราคาไม่จำกัด",
                "AI ดึงข้อมูลลูกค้า",
                "ดาวน์โหลด PDF",
                "ลูกค้า/สินค้าไม่จำกัด",
                "ส่งอีเมลให้ลูกค้า",
              ]}
              cta="เริ่มทดลองฟรี 14 วัน"
              href="/signup"
              popular
            />
          </div>

          {/* FAQ under pricing */}
          <div className="mt-16 text-center">
            <p className="text-gray-600">
              มีคำถาม?{" "}
              <a href="mailto:support@autobill24.com" className="text-blue-600 hover:underline">
                ติดต่อเรา
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ผู้ใช้งานพูดถึงเรา
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <TestimonialCard
              quote="ประหยัดเวลาได้เยอะมาก เมื่อก่อนออกบิลใช้ Excel ตอนนี้แค่ถ่ายรูปก็เสร็จ"
              author="คุณสมชาย"
              role="เจ้าของร้าน Shopee"
            />
            <TestimonialCard
              quote="ฟีเจอร์ AI เจ๋งมาก วางข้อความจาก LINE ได้เลย ไม่ต้องพิมพ์ใหม่"
              author="คุณนภา"
              role="Freelancer"
            />
            <TestimonialCard
              quote="ราคาถูกกว่าที่อื่น แต่ฟีเจอร์ครบ เหมาะกับธุรกิจขนาดเล็กมาก"
              author="คุณวิชัย"
              role="เจ้าของ SME"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            พร้อมเริ่มใช้งานแล้วหรือยัง?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            ทดลองใช้ฟรี 14 วัน ไม่ต้องใช้บัตรเครดิต ยกเลิกได้ทุกเมื่อ
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl hover:bg-gray-100 transition-all shadow-xl"
          >
            เริ่มใช้งานฟรี
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">AutoBill24</span>
              </div>
              <p className="text-sm">
                ระบบออกใบเสนอราคาและใบกำกับภาษีอัตโนมัติ
                <br />
                สำหรับ SME และ Freelancer ไทย
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">ผลิตภัณฑ์</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">ฟีเจอร์</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">ราคา</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">วิธีใช้งาน</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">บริษัท</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/terms" className="hover:text-white transition-colors">ข้อกำหนดการใช้งาน</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">นโยบายความเป็นส่วนตัว</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">ติดต่อ</h4>
              <ul className="space-y-2 text-sm">
                <li>support@autobill24.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 AutoBill24. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components

function StatCard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change && <p className="text-sm text-green-600">{change} จากเดือนที่แล้ว</p>}
    </div>
  );
}

function DocumentRow({ number, customer, amount, status }: { number: string; customer: string; amount: string; status: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="font-medium text-gray-900 text-sm">{number}</p>
        <p className="text-xs text-gray-500">{customer}</p>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900 text-sm">{amount}</p>
        <p className="text-xs text-yellow-600">{status}</p>
      </div>
    </div>
  );
}

function ChannelBar({ name, amount, percent, color }: { name: string; amount: string; percent: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700">{name}</span>
        <span className="font-medium text-gray-900">{amount}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function AIFeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all group">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function ChannelCard({ name, color }: { name: string; color: string }) {
  return (
    <div className={`${color} text-white rounded-xl p-6 text-center font-semibold shadow-lg hover:scale-105 transition-transform cursor-default`}>
      {name}
    </div>
  );
}

function StepCard({ step, title, description, icon }: { step: number; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="text-center relative">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
        {icon}
      </div>
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  popular,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-6 flex flex-col h-full ${popular ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-600/20 shadow-xl shadow-blue-500/30" : "bg-white border-2 border-gray-100"} relative`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-sm font-semibold rounded-full flex items-center gap-1">
          <Star className="w-4 h-4" />
          แนะนำ
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${popular ? "text-white" : "text-gray-900"}`}>{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-4xl font-bold ${popular ? "text-white" : "text-gray-900"}`}>{price}</span>
          <span className={popular ? "text-blue-200" : "text-gray-500"}>{period}</span>
        </div>
        <p className={`text-sm mt-2 ${popular ? "text-blue-200" : "text-gray-500"}`}>{description}</p>
      </div>
      <ul className="space-y-3 mb-6 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <Check className={`w-5 h-5 flex-shrink-0 ${popular ? "text-blue-200" : "text-green-500"}`} />
            <span className={popular ? "text-blue-100" : "text-gray-600"}>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block w-full py-3 text-center font-semibold rounded-xl transition-all mt-auto ${
          popular
            ? "bg-white text-blue-600 hover:bg-gray-100"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
        ))}
      </div>
      <p className="text-gray-600 mb-4">&ldquo;{quote}&rdquo;</p>
      <div>
        <p className="font-semibold text-gray-900">{author}</p>
        <p className="text-sm text-gray-500">{role}</p>
      </div>
    </div>
  );
}
