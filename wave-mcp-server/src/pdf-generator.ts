/**
 * TypeScript Invoice PDF Generator
 * Port of the Python ReportLab invoice generator using PDFKit
 */

import PDFDocument from "pdfkit";
import * as fs from "node:fs";
import * as path from "node:path";

// Brand colors (matching existing design)
const BRAND_TEAL = "#1ABC9C";
const BRAND_DARK = "#2C3E50";
const BRAND_GRAY = "#7F8C8D";
const BRAND_LIGHT_GRAY = "#ECF0F1";

// Page dimensions
const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const MARGIN = 36; // 0.5 inch
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Get paths from environment or use defaults
const getLogoPath = () => process.env.LOGO_PATH || 
  path.join(process.cwd(), "assets", "logo.png");

const getDefaultOutputDir = () => process.env.INVOICE_OUTPUT_DIR || 
  path.join(process.cwd(), "invoices");

// Business info (can be overridden via environment)
const getBusinessInfo = () => ({
  name: process.env.BUSINESS_NAME || "Your Business Name",
  address_line1: process.env.BUSINESS_ADDRESS1 || "City, State ZIP",
  address_line2: process.env.BUSINESS_ADDRESS2 || "Country",
  phone: process.env.BUSINESS_PHONE || "",
});

export interface LineItem {
  name: string;
  description: string;
  quantity: number;
  unit_price: number | string;
}

export interface Customer {
  company_name: string;
  contact_name: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  payment_due: string;
  customer: Customer;
  line_items: LineItem[];
  notes?: string;
}

/**
 * Format a number as USD currency
 */
function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a date string as "Month DD, YYYY"
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
}

/**
 * Calculate invoice totals
 */
function calculateTotals(items: LineItem[]): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, item) => {
    const price = typeof item.unit_price === "string" ? Number.parseFloat(item.unit_price) : item.unit_price;
    return sum + (item.quantity * price);
  }, 0);
  return { subtotal, total: subtotal };
}

/**
 * Generate an invoice PDF
 */
export async function generateInvoicePdf(
  invoiceData: InvoiceData,
  outputPath?: string
): Promise<string> {
  // Determine output path
  const customerSlug = invoiceData.customer.company_name.replaceAll(/[^a-zA-Z0-9]/g, "-");
  const defaultFilename = `invoice-${invoiceData.invoice_number}-${customerSlug}.pdf`;
  const finalPath = outputPath || path.join(getDefaultOutputDir(), defaultFilename);

  // Ensure output directory exists
  const outputDir = path.dirname(finalPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create PDF document
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
  });

  // Pipe to file
  const stream = fs.createWriteStream(finalPath);
  doc.pipe(stream);

  const businessInfo = getBusinessInfo();
  const totals = calculateTotals(invoiceData.line_items);

  // Track Y position
  let y = MARGIN;

  // =========================================================================
  // Header Section: Logo + Invoice Title + Business Info
  // =========================================================================
  
  const logoPath = getLogoPath();
  const logoSize = 72; // 1 inch

  // Try to draw logo if it exists
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, MARGIN, y, { width: logoSize, height: logoSize });
  }

  // Invoice title (right aligned)
  doc.fontSize(28)
     .fillColor(BRAND_DARK)
     .text("INVOICE", MARGIN, y, { 
       width: CONTENT_WIDTH, 
       align: "right" 
     });

  y += 34;

  // Business info (right aligned)
  doc.fontSize(10)
     .fillColor(BRAND_DARK)
     .font("Helvetica-Bold")
     .text(businessInfo.name, MARGIN, y, { width: CONTENT_WIDTH, align: "right" });
  
  y += 14;
  doc.font("Helvetica")
     .text(businessInfo.address_line1, MARGIN, y, { width: CONTENT_WIDTH, align: "right" });
  
  y += 14;
  doc.text(businessInfo.address_line2, MARGIN, y, { width: CONTENT_WIDTH, align: "right" });

  if (businessInfo.phone) {
    y += 20;
    doc.text(businessInfo.phone, MARGIN, y, { width: CONTENT_WIDTH, align: "right" });
  }

  y = Math.max(y, MARGIN + logoSize) + 30;

  // =========================================================================
  // Bill To + Invoice Details Section
  // =========================================================================

  const leftColX = MARGIN;
  // Right column positioning handled inline
  const detailsStartY = y;

  // Bill To section (left side)
  doc.fontSize(10)
     .fillColor(BRAND_TEAL)
     .font("Helvetica-Bold")
     .text("BILL TO", leftColX, y);
  
  y += 16;
  doc.fillColor(BRAND_DARK)
     .font("Helvetica-Bold")
     .text(invoiceData.customer.company_name, leftColX, y);
  
  y += 14;
  doc.font("Helvetica")
     .text(invoiceData.customer.contact_name, leftColX, y);
  
  y += 14;
  const addressLine = `${invoiceData.customer.address_city}, ${invoiceData.customer.address_state} ${invoiceData.customer.address_zip}`;
  doc.text(addressLine, leftColX, y);
  
  y += 14;
  doc.text(invoiceData.customer.country || "United States", leftColX, y);

  if (invoiceData.customer.phone) {
    y += 14;
    doc.text(invoiceData.customer.phone, leftColX, y);
  }

  if (invoiceData.customer.email) {
    y += 14;
    doc.text(invoiceData.customer.email, leftColX, y);
  }

  // Invoice details box (right side) with teal left border
  const detailsBoxHeight = 90;
  const detailsBoxWidth = 210;
  const detailsBoxX = PAGE_WIDTH - MARGIN - detailsBoxWidth;

  // Background
  doc.rect(detailsBoxX, detailsStartY, detailsBoxWidth, detailsBoxHeight)
     .fill(BRAND_LIGHT_GRAY);
  
  // Teal left border
  doc.rect(detailsBoxX, detailsStartY, 4, detailsBoxHeight)
     .fill(BRAND_TEAL);

  // Details content
  let detailY = detailsStartY + 10;
  const labelX = detailsBoxX + 15;
  const valueX = detailsBoxX + 110;

  doc.fontSize(10).fillColor(BRAND_DARK);

  // Invoice Number
  doc.font("Helvetica-Bold").text("Invoice Number:", labelX, detailY);
  doc.font("Helvetica").text(invoiceData.invoice_number, valueX, detailY);
  detailY += 18;

  // Invoice Date
  doc.font("Helvetica-Bold").text("Invoice Date:", labelX, detailY);
  doc.font("Helvetica").text(formatDate(invoiceData.invoice_date), valueX, detailY);
  detailY += 18;

  // Payment Due
  doc.font("Helvetica-Bold").text("Payment Due:", labelX, detailY);
  doc.font("Helvetica").text(formatDate(invoiceData.payment_due), valueX, detailY);
  detailY += 18;

  // Amount Due
  doc.font("Helvetica-Bold").text("Amount Due (USD):", labelX, detailY);
  doc.font("Helvetica-Bold").text(formatCurrency(totals.total), valueX, detailY);

  y = Math.max(y, detailsStartY + detailsBoxHeight) + 30;

  // =========================================================================
  // Line Items Table
  // =========================================================================

  const tableX = MARGIN;
  const tableWidth = CONTENT_WIDTH;
  const col1Width = 280; // Items
  const col2Width = 70;  // Quantity
  const col3Width = 95;  // Price
  const col4Width = 95;  // Amount

  // Table header background
  const headerHeight = 28;
  doc.rect(tableX, y, tableWidth, headerHeight)
     .fill(BRAND_TEAL);

  // Header text
  doc.fontSize(10)
     .fillColor("white")
     .font("Helvetica-Bold");

  const headerY = y + 9;
  doc.text("Items", tableX + 8, headerY);
  doc.text("Quantity", tableX + col1Width + 8, headerY, { width: col2Width - 16, align: "center" });
  doc.text("Price", tableX + col1Width + col2Width + 8, headerY, { width: col3Width - 16, align: "right" });
  doc.text("Amount", tableX + col1Width + col2Width + col3Width + 8, headerY, { width: col4Width - 16, align: "right" });

  y += headerHeight;

  // Table rows
  for (const item of invoiceData.line_items) {
    const price = typeof item.unit_price === "string" ? Number.parseFloat(item.unit_price) : item.unit_price;
    const amount = item.quantity * price;
    
    const rowPadding = 12;

    // Item name (bold) and description (gray)
    doc.fillColor(BRAND_DARK).font("Helvetica-Bold").fontSize(10);
    doc.text(item.name, tableX + 8, y + rowPadding);
    
    const nameHeight = doc.heightOfString(item.name, { width: col1Width - 16 });
    
    if (item.description) {
      doc.fillColor(BRAND_GRAY).font("Helvetica").fontSize(9);
      doc.text(item.description, tableX + 8, y + rowPadding + nameHeight + 2, { width: col1Width - 16 });
    }

    // Quantity, Price, Amount
    doc.fillColor(BRAND_DARK).font("Helvetica").fontSize(10);
    doc.text(String(item.quantity), tableX + col1Width + 8, y + rowPadding, { width: col2Width - 16, align: "center" });
    doc.text(formatCurrency(price), tableX + col1Width + col2Width + 8, y + rowPadding, { width: col3Width - 16, align: "right" });
    doc.text(formatCurrency(amount), tableX + col1Width + col2Width + col3Width + 8, y + rowPadding, { width: col4Width - 16, align: "right" });

    // Calculate row height based on content
    const descHeight = item.description ? doc.heightOfString(item.description, { width: col1Width - 16 }) : 0;
    const rowHeight = Math.max(40, nameHeight + descHeight + rowPadding * 2);
    
    y += rowHeight;
  }

  // Bottom border of last row
  doc.moveTo(tableX, y)
     .lineTo(tableX + tableWidth, y)
     .strokeColor(BRAND_LIGHT_GRAY)
     .lineWidth(1)
     .stroke();

  y += 20;

  // =========================================================================
  // Totals Section
  // =========================================================================

  const totalsX = tableX + col1Width + col2Width;
  const totalsWidth = col3Width + col4Width;

  // Total
  doc.fontSize(10).fillColor(BRAND_DARK).font("Helvetica");
  doc.text("Total:", totalsX, y, { width: col3Width - 8, align: "right" });
  doc.text(formatCurrency(totals.total), totalsX + col3Width, y, { width: col4Width - 8, align: "right" });

  y += 20;

  // Amount Due line
  doc.moveTo(totalsX, y)
     .lineTo(totalsX + totalsWidth, y)
     .strokeColor(BRAND_TEAL)
     .lineWidth(2)
     .stroke();

  y += 8;

  doc.font("Helvetica-Bold");
  doc.text("Amount Due (USD):", totalsX, y, { width: col3Width - 8, align: "right" });
  doc.text(formatCurrency(totals.total), totalsX + col3Width, y, { width: col4Width - 8, align: "right" });

  // Finalize document
  doc.end();

  // Wait for stream to finish
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(finalPath));
    stream.on("error", reject);
  });
}
