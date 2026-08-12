import Link from "next/link";
import {
  FileText,
  Receipt,
  Sparkles,
  Users,
  Package,
  Check,
  ShoppingBag,
  Shield,
  BarChart3,
  Printer,
  CreditCard,
  Star,
  ArrowRight,
  ChevronRight,
  Wrench,
  Smartphone,
  ClipboardList,
  CalendarClock,
  BellRing,
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
              เริ่มใช้งานฟรี
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
              สำหรับช่าง ผู้รับเหมา และธุรกิจติดตั้งทุกประเภท
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              ออกใบเสนอราคาหน้างาน
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ไม่ต้องกลับไปทำที่คอม
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              กรอกเลขผู้เสียภาษี 13 หลัก ระบบค้นหาและเติมข้อมูลบริษัทจากฐานข้อมูลนิติบุคคล
              <br className="hidden md:block" />
              เพิ่มสินค้า วัสดุ ค่าแรง แบ่งงวดงาน และออกเอกสารต่อเนื่องได้ในที่เดียว
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                สร้างใบเสนอราคาฟรี
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                ดูขั้นตอนการใช้งาน
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                ใช้งานบนมือถือได้
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                ดาวน์โหลด PDF ได้ทันที
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                ไม่ต้องมีพื้นฐานบัญชี
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
                <span className="ml-4 text-gray-400 text-sm">autobill24.com/quotations/new</span>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                <div className="grid gap-4 text-left md:grid-cols-3">
                  <WorkflowPreview step="1" title="ข้อมูลลูกค้า" lines={["บริษัท ตัวอย่าง จำกัด", "เลขผู้เสียภาษี 0105550123456"]} />
                  <WorkflowPreview step="2" title="รายการงาน" lines={["ค่าอุปกรณ์ 18,500 บาท", "ค่าแรงติดตั้ง 4,000 บาท"]} />
                  <WorkflowPreview step="3" title="พร้อมส่ง" lines={["รวม VAT 24,075 บาท", "พิมพ์หรือดาวน์โหลด PDF"]} highlighted />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">เร็วกว่า Excel ง่ายกว่าโปรแกรมบัญชี</h2>
            <p className="text-lg text-gray-600">ถ้าต้องการลงบัญชี สต๊อก เงินเดือน และ e-Tax เต็มระบบ โปรแกรมบัญชีจะเหมาะกว่า แต่ถ้าต้องการออกเอกสารให้ลูกค้าเร็ว AutoBill24 ตัดขั้นตอนที่ไม่จำเป็นออก</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard icon={<Smartphone className="w-6 h-6" />} title="ทำจากมือถือหน้างาน" description="เปิดข้อมูลลูกค้า เพิ่มค่าแรงและวัสดุ แล้วส่งเอกสารได้โดยไม่ต้องกลับไปเปิดคอม" />
            <FeatureCard icon={<ClipboardList className="w-6 h-6" />} title="ไม่ต้องตั้งระบบบัญชี" description="เริ่มจากเอกสารที่ใช้งานจริง ไม่ต้องเรียนผังบัญชีหรือขั้นตอนที่ซับซ้อนก่อนเริ่มงาน" />
            <FeatureCard icon={<Wrench className="w-6 h-6" />} title="รองรับทั้งงานช่างและงานติดตั้ง" description="แยกสินค้า อุปกรณ์ ค่าแรง ส่วนลด VAT และเงื่อนไขงาน พร้อมเรียกใช้รายการเดิมซ้ำได้" />
          </div>
          <p className="text-center text-sm text-gray-500 mt-8">AutoBill24 เป็นระบบจัดทำและจัดเก็บเอกสารธุรกิจ ไม่ใช่บริการรับรองบัญชีหรือระบบ e-Tax Invoice</p>
        </div>
      </section>

      {/* Fast document workflow highlight */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                <Wrench className="w-4 h-4" />
                ทำเอกสารได้ตั้งแต่หน้างาน
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                ขายสินค้า รับงานติดตั้ง แล้วออกใบเสนอราคาได้เลย
              </h2>
              <p className="text-lg text-blue-100 mb-8 leading-relaxed">
                กรอกเลขผู้เสียภาษี 13 หลัก ระบบช่วยค้นหาและเติมชื่อบริษัทกับที่อยู่จากฐานข้อมูลนิติบุคคล
                หรือถ่ายรูปนามบัตรและวางข้อความจากแชต เพื่อลดการพิมพ์ซ้ำก่อนเริ่มทำเอกสาร
              </p>
              <div className="space-y-4">
                <WorkflowFeatureItem icon={<Smartphone />} text="ใช้งานบนมือถือขณะคุยกับลูกค้า" />
                <WorkflowFeatureItem icon={<ClipboardList />} text="แยกค่าแรง วัสดุ ส่วนลด และ VAT ชัดเจน" />
                <WorkflowFeatureItem icon={<Users />} text="บันทึกข้อมูลลูกค้าและรายการงานไว้ใช้ซ้ำ" />
                <WorkflowFeatureItem icon={<Printer />} text="พิมพ์หรือดาวน์โหลด PDF พร้อมโลโก้และลายเซ็น" />
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">ตัวอย่างสินค้าและงานติดตั้ง</h4>
                    <p className="text-sm text-gray-500">แยกรายการให้ลูกค้าอ่านง่าย</p>
                  </div>
                </div>
                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 text-left text-sm text-gray-600">
                  <p className="font-medium mb-1">ติดตั้งเครื่องปรับอากาศ 2 เครื่อง</p>
                  <p className="mb-1">ค่าอุปกรณ์และวัสดุ 18,500 บาท</p>
                  <p className="mb-1">ค่าแรงติดตั้ง 4,000 บาท</p>
                  <p>รับประกันงานติดตั้ง 90 วัน</p>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <Check className="w-4 h-4" />
                    พร้อมออกใบเสนอราคา
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>✓ ข้อมูลลูกค้าครบ</p>
                    <p>✓ ค่าแรงและวัสดุแยกรายการ</p>
                    <p>✓ คำนวณส่วนลดและ VAT แล้ว</p>
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
              เอกสารที่ธุรกิจบริการใช้จริง
            </h2>
            <p className="text-lg text-gray-600">
              ทำงานง่ายกว่าสเปรดชีต โดยไม่ต้องเรียนระบบบัญชีเต็มรูปแบบ
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
              description="มีช่องข้อมูลสำคัญสำหรับจัดทำใบกำกับภาษี พร้อมขั้นตอนตรวจสอบสถานะ VAT ก่อนเปิดใช้งาน"
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
              icon={<Shield className="w-6 h-6" />}
              title="เก็บประวัติเอกสาร"
              description="ค้นหาและเปิดดูเอกสารย้อนหลังได้ พร้อมสถานะของเอกสารแต่ละรายการ"
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6" />}
              title="ติดตามการชำระเงิน"
              description="บันทึกสถานะใบแจ้งหนี้และการรับชำระ เพื่อรู้ว่าเอกสารใดรอดำเนินการ"
            />
            <FeatureCard
              icon={<CalendarClock className="w-6 h-6" />}
              title="แบ่งงวดงานและเก็บเงินตรงเวลา"
              description="กำหนดงวดเป็นเปอร์เซ็นต์ในใบเสนอราคา ระบบเตือนเมื่อถึงกำหนดและกดสร้างใบแจ้งหนี้ของงวดนั้นได้ทันที"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="รายงานและสถิติ"
              description="ดูจำนวนเอกสาร ลูกค้า และภาพรวมรายการสำคัญจากหน้าแดชบอร์ด"
            />
            <FeatureCard
              icon={<ShoppingBag className="w-6 h-6" />}
              title="ช่องทางขาย"
              description="ระบุที่มาของงานจาก Shopee, Lazada, Facebook, TikTok, LINE และช่องทางอื่น"
            />
          </div>
        </div>
      </section>

      {/* Sales Channels */}
      <section id="channels" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              รู้ว่างานมาจากช่องทางไหน
            </h2>
            <p className="text-lg text-gray-600">
              ระบุช่องทางที่มาของเอกสาร เพื่อค้นหาและจัดกลุ่มงานได้ง่ายขึ้น
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
              จากรับงานถึงเก็บเงินใน 4 ขั้นตอน
            </h2>
            <p className="text-lg text-gray-600">
              ออกบิลได้ภายในไม่กี่นาที
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

            <StepCard
              step={1}
              title="เพิ่มข้อมูลลูกค้าและสินค้า"
              description="กรอกเลขผู้เสียภาษี 13 หลักเพื่อค้นหาและเติมข้อมูลบริษัท หรือถ่ายรูปนามบัตรและวางข้อความ"
              icon={<Users />}
            />
            <StepCard
              step={2}
              title="เสนอราคาและแบ่งงวด"
              description="เพิ่มค่าแรง วัสดุ และกำหนดงวดชำระให้รวมครบ 100%"
              icon={<FileText />}
            />
            <StepCard
              step={3}
              title="รับการแจ้งเตือน"
              description="Dashboard แจ้งเตือนตามแพ็กเกจเมื่อถึงเวลาเรียกเก็บเงินแต่ละงวด"
              icon={<BellRing />}
            />
            <StepCard
              step={4}
              title="ออกใบแจ้งหนี้ตามงวด"
              description="กดครั้งเดียวเพื่อเตรียมข้อมูลลูกค้า ยอด VAT และวันครบกำหนด แล้วตรวจสอบก่อนออกเอกสาร"
              icon={<Printer />}
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
              ทุกแพ็กเกจใช้ระบบแยกข้อมูลลูกค้าและดาวน์โหลด PDF ได้
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
                "20 เอกสารรวม/เดือน",
                "ครบทั้ง 4 ประเภทเอกสาร",
                "แยกข้อมูลลูกค้าอัตโนมัติ",
                "ดาวน์โหลด PDF",
                "ลูกค้า/สินค้าไม่จำกัด",
                "เก็บข้อมูลบน Cloud",
                "แบ่งงวดงานสูงสุด 2 งวด",
                "แจ้งเตือนในวันที่ครบกำหนด",
              ]}
              cta="เริ่มใช้งานฟรี"
              href="/signup"
            />

            {/* Solo Plan */}
            <PricingCard
              name="SOLO"
              price="฿149"
              period="/เดือน"
              description="สำหรับ Freelancer"
              features={[
                "100 เอกสารรวม/เดือน",
                "ครบทั้ง 4 ประเภทเอกสาร",
                "แยกข้อมูลลูกค้าอัตโนมัติ",
                "ดาวน์โหลด PDF",
                "ลูกค้า/สินค้าไม่จำกัด",
                "เก็บข้อมูลบน Cloud",
                "แบ่งงวดงานสูงสุด 5 งวด",
                "แจ้งเตือนล่วงหน้า 3 วัน",
              ]}
              cta="เลือกแพ็กเกจ SOLO"
              href="/signup"
            />

            {/* Pro Plan */}
            <PricingCard
              name="PRO"
              price="฿249"
              period="/เดือน"
              description="สำหรับธุรกิจที่เติบโต"
              features={[
                "เอกสารรวมไม่จำกัด",
                "ครบทั้ง 4 ประเภทเอกสาร",
                "แยกข้อมูลลูกค้าอัตโนมัติ",
                "ดาวน์โหลด PDF",
                "ลูกค้า/สินค้าไม่จำกัด",
                "เก็บข้อมูลบน Cloud",
                "แบ่งงวดงานไม่จำกัด",
                "แจ้งเตือนล่วงหน้า 7 วัน",
              ]}
              cta="เลือกแพ็กเกจ PRO"
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

      {/* Suitable businesses */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              เหมาะกับงานแบบไหน
            </h2>
            <p className="text-lg text-gray-600">เริ่มงานไว ออกเอกสารง่าย และกลับมาแก้ไขได้จากทุกอุปกรณ์</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard icon={<Wrench className="w-6 h-6" />} title="ช่างติดตั้งและซ่อมบำรุง" description="เหมาะกับช่างแอร์ ช่างไฟ ช่างประปา กล้องวงจรปิด และระบบเครือข่าย แยกค่าแรง อะไหล่ และวัสดุได้ชัดเจน" />
            <FeatureCard icon={<ClipboardList className="w-6 h-6" />} title="โซลาร์เซลล์และระบบอัตโนมัติ" description="ออกใบเสนอราคาสินค้าพร้อมติดตั้ง เช่น โซลาร์เซลล์ ประตูรั้วไฟฟ้า ปั๊มน้ำ และระบบควบคุม พร้อมแบ่งชำระเป็นงวด" />
            <FeatureCard icon={<Users className="w-6 h-6" />} title="ผู้รับเหมาและธุรกิจบริการ" description="รองรับงานก่อสร้าง รีโนเวท ตกแต่ง ฟรีแลนซ์ และธุรกิจบริการ ตั้งแต่ใบเสนอราคาจนถึงใบเสร็จหรือใบกำกับภาษี" />
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
            เริ่มจากแพ็กเกจฟรี ไม่ต้องใช้บัตรเครดิต และอัปเกรดภายหลังได้
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
                ระบบออกใบเสนอราคาและเอกสารรับเงิน
                <br />
                สำหรับช่าง ผู้รับเหมา และธุรกิจติดตั้งไทย
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
            <p>&copy; 2026 AutoBill24. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components

function WorkflowPreview({ step, title, lines, highlighted = false }: { step: string; title: string; lines: string[]; highlighted?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlighted ? "border-blue-300 bg-blue-50" : "bg-white"}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{step}</span>
        <p className="font-semibold text-gray-900">{title}</p>
      </div>
      {lines.map((line) => <p key={line} className="mb-2 text-sm text-gray-600">✓ {line}</p>)}
    </div>
  );
}

function WorkflowFeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
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
