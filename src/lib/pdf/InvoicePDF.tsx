import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

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
    padding: 40,
    fontFamily: "THSarabunNew",
    fontSize: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  documentTitle: {
    textAlign: "right",
  },
  copyType: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
  },
  copyTypeOriginal: {
    color: "#dc2626",
  },
  copyTypeCopy: {
    color: "#2563eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 8,
  },
  documentNumber: {
    fontSize: 12,
    fontWeight: "bold",
  },
  dateInfo: {
    fontSize: 9,
    color: "#666",
    marginTop: 4,
  },
  customerSection: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  customerName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  colNo: { width: "8%", textAlign: "center" },
  colDesc: { width: "37%", paddingRight: 8 },
  colQty: { width: "12%", textAlign: "right" },
  colUnit: { width: "10%", textAlign: "center" },
  colPrice: { width: "16%", textAlign: "right" },
  colAmount: { width: "17%", textAlign: "right" },
  headerText: {
    fontWeight: "bold",
    fontSize: 9,
  },
  summarySection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  summaryBox: {
    width: 250,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  summaryTotalText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  discountText: {
    color: "#dc2626",
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    marginTop: 20,
  },
  bankSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
    marginTop: 12,
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 50,
  },
  signatureBox: {
    alignItems: "center",
    width: 150,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    width: "100%",
    height: 40,
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#666",
  },
});

interface InvoicePDFProps {
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date: string | null;
    customer_name: string;
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
    bank_name?: string;
    bank_branch?: string;
    account_name?: string;
    account_number?: string;
  };
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

// Component สำหรับแต่ละหน้า (ต้นฉบับ/สำเนา)
function InvoicePage({
  invoice,
  items,
  company,
  copyType,
}: InvoicePDFProps & { copyType: "original" | "copy" }) {
  const isOriginal = copyType === "original";

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.companyInfo}>
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
            โทร: {company?.phone || "-"} | อีเมล: {company?.email || "-"}
          </Text>
          <Text style={styles.companyDetail}>
            เลขประจำตัวผู้เสียภาษี: {company?.tax_id || "-"}
            {company?.branch_code &&
              ` (${company.branch_code === "00000" ? "สำนักงานใหญ่" : `สาขา: ${company.branch_name || company.branch_code}`})`}
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

      {/* Customer Info */}
      <View style={styles.customerSection}>
        <Text style={styles.sectionTitle}>ลูกค้า</Text>
        <Text style={styles.customerName}>{invoice.customer_name}</Text>
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
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colNo}>{index + 1}</Text>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{formatNumber(item.quantity)}</Text>
            <Text style={styles.colUnit}>{item.unit}</Text>
            <Text style={styles.colPrice}>{formatNumber(item.unit_price)}</Text>
            <Text style={styles.colAmount}>{formatNumber(item.amount)}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
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
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalText}>รวมทั้งสิ้น</Text>
            <Text style={styles.summaryTotalText}>
              {formatNumber(invoice.total_amount)} บาท
            </Text>
          </View>
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

      {/* Signature */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>ผู้รับสินค้า/บริการ</Text>
          <Text style={styles.signatureLabel}>วันที่ ____/____/____</Text>
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>ผู้มีอำนาจลงนาม</Text>
          <Text style={styles.signatureLabel}>วันที่ ____/____/____</Text>
        </View>
      </View>
    </Page>
  );
}

export function InvoicePDF({ invoice, items, company }: InvoicePDFProps) {
  return (
    <Document>
      {/* ต้นฉบับ */}
      <InvoicePage
        invoice={invoice}
        items={items}
        company={company}
        copyType="original"
      />
      {/* สำเนา */}
      <InvoicePage
        invoice={invoice}
        items={items}
        company={company}
        copyType="copy"
      />
    </Document>
  );
}
