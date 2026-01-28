import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WaveClient } from "./wave-client.js";
import { generateInvoicePdf, InvoiceData } from "./pdf-generator.js";

export function registerTools(server: McpServer) {
  const client = new WaveClient(
    process.env.WAVE_API_KEY!,
    process.env.WAVE_BUSINESS_ID!
  );

  // List all invoices
  server.tool(
    "list_invoices",
    "List invoices from Wave with pagination",
    { page: z.number().optional(), pageSize: z.number().optional() },
    async ({ page = 1, pageSize = 25 }) => {
      const result = await client.listInvoices(page, pageSize);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Get single invoice details
  server.tool(
    "get_invoice",
    "Get full details of a specific invoice",
    { invoiceId: z.string() },
    async ({ invoiceId }) => {
      const result = await client.getInvoice(invoiceId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // List customers
  server.tool(
    "list_customers",
    "List all customers from Wave",
    {},
    async () => {
      const result = await client.listCustomers();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Export invoice to JSON format
  server.tool(
    "export_invoice_json",
    "Export Wave invoice to JSON format",
    { invoiceId: z.string() },
    async ({ invoiceId }) => {
      const result = await client.getInvoice(invoiceId) as any;
      const invoice = result.business.invoice;
      const exportData = transformInvoiceData(invoice);
      return { 
        content: [{ type: "text", text: JSON.stringify(exportData, null, 2) }] 
      };
    }
  );

  // Generate PDF from Wave invoice (all-in-one, native TypeScript)
  server.tool(
    "generate_invoice_pdf",
    "Fetch invoice from Wave and generate a branded PDF. Returns the path to the generated PDF.",
    { 
      invoiceId: z.string().describe("Wave invoice ID"),
      outputPath: z.string().optional().describe("Custom output path for PDF (optional)")
    },
    async ({ invoiceId, outputPath }) => {
      try {
        // 1. Fetch invoice from Wave
        const result = await client.getInvoice(invoiceId) as any;
        const invoice = result.business.invoice;
        
        if (!invoice) {
          return { 
            content: [{ type: "text", text: `Error: Invoice ${invoiceId} not found` }],
            isError: true
          };
        }

        // 2. Transform to PDF generator format
        const invoiceData = transformInvoiceData(invoice);

        // 3. Generate PDF using native TypeScript generator
        const pdfPath = await generateInvoicePdf(invoiceData, outputPath);

        // 4. Return result
        return { 
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              success: true,
              pdfPath,
              invoiceNumber: invoice.invoiceNumber,
              customer: invoice.customer.name,
              amount: invoice.amountDue?.value || "0.00",
              message: `PDF generated: ${pdfPath}`
            }, null, 2)
          }] 
        };
      } catch (error: any) {
        return { 
          content: [{ type: "text", text: `Error generating PDF: ${error.message}` }],
          isError: true
        };
      }
    }
  );
}

// Helper function to transform Wave invoice to PDF generator format
function transformInvoiceData(invoice: any): InvoiceData {
  return {
    invoice_number: invoice.invoiceNumber,
    invoice_date: invoice.invoiceDate,
    payment_due: invoice.dueDate,
    customer: {
      company_name: invoice.customer.name,
      contact_name: invoice.customer.name,
      address_city: invoice.customer.address?.city || "",
      address_state: invoice.customer.address?.province?.code || "",
      address_zip: invoice.customer.address?.postalCode || "",
      country: invoice.customer.address?.country?.code || "United States",
      email: invoice.customer.email || "",
    },
    line_items: invoice.items.map((item: any) => ({
      name: item.product?.name || item.description,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    })),
    notes: invoice.memo || "",
  };
}
