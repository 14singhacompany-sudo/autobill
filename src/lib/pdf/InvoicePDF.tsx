import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { numberToThaiText } from "@/lib/utils/numberToThaiText";

// Register Thai font - using TH Sarabun New which has complete Thai character support
Font.register({
  family: "THSarabunNew",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/font-th-sarabun-new@1.0.0/fonts/THSarabunNew-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/font-th-sarabun-new@1.0.0/fonts/THSarabunNew_bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontFamily: "THSarabunNew",
    fontSize: 11,
    position: "relative",
  },
  // Header แบบเต็ม (หน้าแรก)
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  companyInfo: {
    flex: 1,
  },
  companyLogo: {
    maxHeight: 48,
    maxWidth: 150,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 10,
    color: "#666",
    marginBottom: 1,
  },
  documentTitle: {
    textAlign: "right",
  },
  copyType: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 2,
  },
  copyTypeOriginal: {
    color: "#dc2626",
  },
  copyTypeCopy: {
    color: "#2563eb",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 11,
    fontWeight: "bold",
  },
  dateInfo: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  // Header แบบย่อ (หน้าถัดไป)
  headerCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  headerCompactLeft: {
    flex: 1,
  },
  headerCompactRight: {
    textAlign: "right",
  },
  headerCompactText: {
    fontSize: 9,
    marginBottom: 1,
  },
  headerCompactBold: {
    fontSize: 10,
    fontWeight: "bold",
  },
  // Customer section
  customerSection: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 10,
    color: "#666",
    marginBottom: 1,
  },
  // Table
  table: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colNo: { width: "8%", textAlign: "center", fontSize: 9 },
  colDesc: { width: "37%", paddingRight: 8, fontSize: 9 },
  colQty: { width: "12%", textAlign: "right", fontSize: 9 },
  colUnit: { width: "10%", textAlign: "center", fontSize: 9 },
  colPrice: { width: "16%", textAlign: "right", fontSize: 9 },
  colAmount: { width: "17%", textAlign: "right", fontSize: 9 },
  headerText: {
    fontWeight: "bold",
    fontSize: 9,
  },
  // ยอดยกไป/ยกมา
  carryRow: {
    flexDirection: "row",
    backgroundColor: "#fff3cd",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ffc107",
  },
  carryText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#856404",
  },
  // Summary
  summarySection: {
    marginBottom: 4,
  },
  summaryBox: {
    marginLeft: "auto",
    width: 220,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    fontSize: 9,
  },
  summaryTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryThaiText: {
    fontSize: 10,
    color: "#666",
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 6,
    borderRadius: 4,
    width: 220,
  },
  summaryTotalText: {
    fontWeight: "bold",
    fontSize: 11,
  },
  discountText: {
    color: "#dc2626",
  },
  // Notes & Bank
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 6,
    marginTop: 8,
  },
  bankSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 6,
    marginTop: 6,
  },
  // Signature - fixed at bottom (3 columns)
  signatureSection: {
    position: "absolute",
    bottom: 25,
    left: 25,
    right: 25,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  signatureBox: {
    alignItems: "center",
    flex: 1,
  },
  stampBox: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    width: 110,
    height: 20,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
  },
  stampCircle: {
    width: 70,
    height: 70,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 35,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stampImage: {
    width: 180,
    height: 180,
    objectFit: "contain",
  },
  signatureImage: {
    width: 80,
    height: 40,
    objectFit: "contain",
    marginBottom: -23,
  },
  signatoryName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 1,
  },
  signatoryPosition: {
    fontSize: 9,
    color: "#666",
  },
  stampText: {
    fontSize: 7,
    color: "#999",
    textAlign: "center",
  },
  // Page number
  pageNumber: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
  },
  // Content wrapper to leave space for signature
  contentWrapper: {
    flex: 1,
    paddingBottom: 80, // เว้นที่ให้ลายเซ็นที่ท้ายหน้า
  },
});

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date: string | null;
    customer_name: string;
    customer_name_en?: string | null;
    customer_address: string | null;
    customer_tax_id: string | null;
    customer_branch_code: string | null;
    customer_contact: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    subtotal: number;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
    amount_before_vat: number;
    vat_rate: number;
    vat_amount: number;
    total_amount: number;
    notes: string | null;
    terms_conditions: string | null;
  };
  items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
  }[];
  company?: {
    company_name: string;
    company_name_en?: string;
    address: string;
    phone: string;
    email: string;
    tax_id: string;
    branch_code?: string;
    branch_name?: string;
    logo_url?: string;
    stamp_url?: string;
    signature_url?: string;
    signatory_name?: string;
    signatory_position?: string;
    bank_name?: string;
    bank_branch?: string;
    account_name?: string;
    account_number?: string;
  };
  showStamp?: boolean;
  showSignature?: boolean;
}

const formatNumber = (num: number) => {
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// จำนวนรายการต่อหน้า
const ITEMS_PER_FIRST_PAGE = 8;
const ITEMS_PER_SUBSEQUENT_PAGE = 12;

// แบ่งรายการเป็นหน้าๆ
function splitItemsIntoPages(items: InvoicePDFProps["items"]) {
  const pages: { items: InvoicePDFProps["items"]; startIndex: number; carryForward?: number; carryOver?: number }[] = [];

  if (items.length <= ITEMS_PER_FIRST_PAGE) {
    // ทั้งหมดอยู่หน้าเดียว
    pages.push({ items, startIndex: 0 });
  } else {
    // หน้าแรก
    const firstPageItems = items.slice(0, ITEMS_PER_FIRST_PAGE);
    const firstPageTotal = firstPageItems.reduce((sum, item) => sum + item.amount, 0);
    pages.push({
      items: firstPageItems,
      startIndex: 0,
      carryForward: firstPageTotal
    });

    // หน้าถัดไป
    let currentIndex = ITEMS_PER_FIRST_PAGE;
    let runningTotal = firstPageTotal;

    while (currentIndex < items.length) {
      const pageItems = items.slice(currentIndex, currentIndex + ITEMS_PER_SUBSEQUENT_PAGE);
      const pageTotal = pageItems.reduce((sum, item) => sum + item.amount, 0);
      const carryOver = runningTotal;
      runningTotal += pageTotal;

      const isLastPage = currentIndex + ITEMS_PER_SUBSEQUENT_PAGE >= items.length;

      pages.push({
        items: pageItems,
        startIndex: currentIndex,
        carryOver,
        carryForward: isLastPage ? undefined : runningTotal
      });

      currentIndex += ITEMS_PER_SUBSEQUENT_PAGE;
    }
  }

  return pages;
}

// Component สำหรับแต่ละหน้า
function InvoicePage({
  invoice,
  items,
  company,
  copyType,
  pageNumber,
  totalPages,
  isFirstPage,
  isLastPage,
  startIndex,
  carryOver,
  carryForward,
  showStamp = true,
  showSignature = true,
}: InvoicePDFProps & {
  copyType: "original" | "copy";
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  startIndex: number;
  carryOver?: number;
  carryForward?: number;
}) {
  const isOriginal = copyType === "original";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.contentWrapper}>
      {/* Header */}
      {isFirstPage ? (
        // หน้าแรก - Header เต็ม
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {company?.logo_url && (
              <Image src={company.logo_url} style={styles.companyLogo} />
            )}
            <Text style={styles.companyName}>
              {company?.company_name || "ชื่อบริษัท"}
            </Text>
            {company?.company_name_en && (
              <Text style={styles.companyDetail}>{company.company_name_en}</Text>
            )}
            <Text style={styles.companyDetail}>
              {company?.address || "ที่อยู่บริษัท"}
            </Text>
            <Text style={styles.companyDetail}>
              เลขประจำตัวผู้เสียภาษี: {company?.tax_id || "-"}
              {company?.branch_code &&
                ` (${company.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${company.branch_name || company.branch_code}`})`}
            </Text>
            <Text style={styles.companyDetail}>
              โทร: {company?.phone || "-"} | อีเมล: {company?.email || "-"}
            </Text>
          </View>
          <View style={styles.documentTitle}>
            <Text
              style={[
                styles.copyType,
                isOriginal ? styles.copyTypeOriginal : styles.copyTypeCopy,
              ]}
            >
              ({isOriginal ? "ต้นฉบับ" : "สำเนา"})
            </Text>
            <Text style={styles.title}>ใบกำกับภาษี/ใบเสร็จรับเงิน</Text>
            <Text style={styles.documentNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.dateInfo}>
              วันที่: {formatDate(invoice.issue_date)}
            </Text>
          </View>
        </View>
      ) : (
        // หน้าถัดไป - Header แบบย่อ
        <View style={styles.headerCompact}>
          <View style={styles.headerCompactLeft}>
            <Text style={styles.headerCompactBold}>
              {company?.company_name || "ชื่อบริษัท"}
            </Text>
            <Text style={styles.headerCompactText}>
              ลูกค้า: {invoice.customer_name}
            </Text>
          </View>
          <View style={styles.headerCompactRight}>
            <Text
              style={[
                styles.copyType,
                isOriginal ? styles.copyTypeOriginal : styles.copyTypeCopy,
              ]}
            >
              ({isOriginal ? "ต้นฉบับ" : "สำเนา"})
            </Text>
            <Text style={styles.headerCompactBold}>
              {invoice.invoice_number}
            </Text>
            <Text style={styles.headerCompactText}>
              วันที่: {formatDate(invoice.issue_date)}
            </Text>
          </View>
        </View>
      )}

      {/* Customer Info - เฉพาะหน้าแรก */}
      {isFirstPage && (
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>ลูกค้า</Text>
          <Text style={styles.customerName}>{invoice.customer_name}</Text>
          {invoice.customer_name_en && (
            <Text style={styles.customerDetail}>{invoice.customer_name_en}</Text>
          )}
          {invoice.customer_address && (
            <Text style={styles.customerDetail}>{invoice.customer_address}</Text>
          )}
          {invoice.customer_tax_id && (
            <Text style={styles.customerDetail}>
              เลขประจำตัวผู้เสียภาษี: {invoice.customer_tax_id}
              {invoice.customer_branch_code &&
                ` (${invoice.customer_branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${invoice.customer_branch_code}`})`}
            </Text>
          )}
          {invoice.customer_contact && (
            <Text style={styles.customerDetail}>
              ผู้ติดต่อ: {invoice.customer_contact}
            </Text>
          )}
          {invoice.customer_phone && (
            <Text style={styles.customerDetail}>
              โทร: {invoice.customer_phone}
            </Text>
          )}
          {invoice.customer_email && (
            <Text style={styles.customerDetail}>
              อีเมล: {invoice.customer_email}
            </Text>
          )}
        </View>
      )}

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colNo, styles.headerText]}>ลำดับ</Text>
          <Text style={[styles.colDesc, styles.headerText]}>รายการ</Text>
          <Text style={[styles.colQty, styles.headerText]}>จำนวน</Text>
          <Text style={[styles.colUnit, styles.headerText]}>หน่วย</Text>
          <Text style={[styles.colPrice, styles.headerText]}>ราคา/หน่วย</Text>
          <Text style={[styles.colAmount, styles.headerText]}>จำนวนเงิน</Text>
        </View>

        {/* ยอดยกมา (หน้าที่ 2 เป็นต้นไป) */}
        {carryOver !== undefined && (
          <View style={styles.carryRow}>
            <Text style={[styles.colNo, styles.carryText]}></Text>
            <Text style={[styles.colDesc, styles.carryText]}>ยอดยกมา</Text>
            <Text style={[styles.colQty, styles.carryText]}></Text>
            <Text style={[styles.colUnit, styles.carryText]}></Text>
            <Text style={[styles.colPrice, styles.carryText]}></Text>
            <Text style={[styles.colAmount, styles.carryText]}>{formatNumber(carryOver)}</Text>
          </View>
        )}

        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colNo}>{startIndex + index + 1}</Text>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{formatNumber(item.quantity)}</Text>
            <Text style={styles.colUnit}>{item.unit}</Text>
            <Text style={styles.colPrice}>{formatNumber(item.unit_price)}</Text>
            <Text style={styles.colAmount}>{formatNumber(item.amount)}</Text>
          </View>
        ))}

        {/* ยอดยกไป (ไม่ใช่หน้าสุดท้าย) */}
        {carryForward !== undefined && (
          <View style={styles.carryRow}>
            <Text style={[styles.colNo, styles.carryText]}></Text>
            <Text style={[styles.colDesc, styles.carryText]}>ยอดยกไป</Text>
            <Text style={[styles.colQty, styles.carryText]}></Text>
            <Text style={[styles.colUnit, styles.carryText]}></Text>
            <Text style={[styles.colPrice, styles.carryText]}></Text>
            <Text style={[styles.colAmount, styles.carryText]}>{formatNumber(carryForward)}</Text>
          </View>
        )}
      </View>

      {/* Summary - เฉพาะหน้าสุดท้าย */}
      {isLastPage && (
        <>
          <View style={styles.summarySection}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text>รวมเงิน</Text>
                <Text>{formatNumber(invoice.subtotal)}</Text>
              </View>
              {invoice.discount_amount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountText}>
                    ส่วนลด{" "}
                    {invoice.discount_type === "percent"
                      ? `(${invoice.discount_value}%)`
                      : ""}
                  </Text>
                  <Text style={styles.discountText}>
                    -{formatNumber(invoice.discount_amount)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text>มูลค่าก่อน VAT</Text>
                <Text>{formatNumber(invoice.amount_before_vat)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>VAT {invoice.vat_rate}%</Text>
                <Text>{formatNumber(invoice.vat_amount)}</Text>
              </View>
            </View>
          </View>

          {/* Thai Text + Total Row */}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryThaiText}>
              ({numberToThaiText(invoice.total_amount)})
            </Text>
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalText}>รวมทั้งสิ้น</Text>
              <Text style={styles.summaryTotalText}>
                {formatNumber(invoice.total_amount)} บาท
              </Text>
            </View>
          </View>

          {/* Notes */}
          {(invoice.notes || invoice.terms_conditions) && (
            <View style={styles.notesSection}>
              {invoice.notes && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.sectionTitle}>หมายเหตุ</Text>
                  <Text style={styles.customerDetail}>{invoice.notes}</Text>
                </View>
              )}
              {invoice.terms_conditions && (
                <View>
                  <Text style={styles.sectionTitle}>เงื่อนไข</Text>
                  <Text style={styles.customerDetail}>
                    {invoice.terms_conditions}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Bank Info */}
          {company?.bank_name && (
            <View style={styles.bankSection}>
              <Text style={styles.sectionTitle}>ข้อมูลการชำระเงิน</Text>
              <Text style={styles.customerDetail}>
                ธนาคาร: {company.bank_name} สาขา {company.bank_branch}
              </Text>
              <Text style={styles.customerDetail}>
                ชื่อบัญชี: {company.account_name}
              </Text>
              <Text style={styles.customerDetail}>
                เลขที่บัญชี: {company.account_number}
              </Text>
            </View>
          )}
        </>
      )}
      </View>

      {/* Signature - ทุกหน้า (fixed at bottom) - 3 columns */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>ผู้รับสินค้า/บริการ</Text>
          <Text style={styles.signatureLabel}>วันที่ ____/____/____</Text>
        </View>
        <View style={styles.stampBox}>
          {showStamp && company?.stamp_url ? (
            <Image src={company.stamp_url} style={styles.stampImage} />
          ) : (
            <View style={styles.stampCircle}>
              <Text style={styles.stampText}>ประทับตรา</Text>
              <Text style={styles.stampText}>(ถ้ามี)</Text>
            </View>
          )}
        </View>
        <View style={styles.signatureBox}>
          {showSignature && company?.signature_url && (
            <Image src={company.signature_url} style={styles.signatureImage} />
          )}
          <View style={styles.signatureLine} />
          {showSignature && company?.signatory_name ? (
            <>
              <Text style={styles.signatoryName}>{company.signatory_name}</Text>
              {company?.signatory_position && (
                <Text style={styles.signatoryPosition}>{company.signatory_position}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.signatureLabel}>ผู้มีอำนาจลงนาม</Text>
              <Text style={styles.signatureLabel}>วันที่ ____/____/____</Text>
            </>
          )}
        </View>
      </View>

      {/* Page Number */}
      <Text style={styles.pageNumber}>
        หน้า {pageNumber} / {totalPages}
      </Text>
    </Page>
  );
}

export function InvoicePDF({ invoice, items, company, showStamp = true, showSignature = true }: InvoicePDFProps) {
  const pages = splitItemsIntoPages(items);
  const totalPages = pages.length;

  return (
    <Document>
      {/* ต้นฉบับ */}
      {pages.map((page, index) => (
        <InvoicePage
          key={`original-${index}`}
          invoice={invoice}
          items={page.items}
          company={company}
          copyType="original"
          pageNumber={index + 1}
          totalPages={totalPages}
          isFirstPage={index === 0}
          isLastPage={index === pages.length - 1}
          startIndex={page.startIndex}
          carryOver={page.carryOver}
          carryForward={page.carryForward}
          showStamp={showStamp}
          showSignature={showSignature}
        />
      ))}
      {/* สำเนา */}
      {pages.map((page, index) => (
        <InvoicePage
          key={`copy-${index}`}
          invoice={invoice}
          items={page.items}
          company={company}
          copyType="copy"
          pageNumber={index + 1}
          totalPages={totalPages}
          isFirstPage={index === 0}
          isLastPage={index === pages.length - 1}
          startIndex={page.startIndex}
          carryOver={page.carryOver}
          carryForward={page.carryForward}
          showStamp={showStamp}
          showSignature={showSignature}
        />
      ))}
    </Document>
  );
}
