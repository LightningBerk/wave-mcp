# Wave MCP Server

MCP server for Wave invoicing with built-in PDF generation. Pull invoice data from your Wave account and generate branded PDF invoices—all from Claude or any MCP-compatible AI.

## Features

- 📋 **List invoices** from your Wave account
- 🔍 **Get invoice details** with customer info and line items
- 👥 **List customers** from Wave
- 📄 **Generate PDF invoices** with your branding

**No Python required.** Pure TypeScript with PDFKit.

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/wave-mcp-server.git
cd wave-mcp-server
npm install
npm run build
cp .env.example .env
# Edit .env with your credentials
```

## Getting Wave API Credentials

1. Go to [developer.waveapps.com](https://developer.waveapps.com)
2. Create a new application
3. Generate a **Full Access** token
4. Copy your Business ID from the dashboard

## Configuration

Edit `.env` with your credentials:

```env
WAVE_API_KEY=your_full_access_token
WAVE_BUSINESS_ID=your_business_id
BUSINESS_NAME=Your Business Name
# See .env.example for all options
```

## Adding Your Logo

Place your logo at `assets/logo.png`. Recommended size: 200x200px or larger, square aspect ratio.

## Claude Desktop Setup

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "wave": {
      "command": "node",
      "args": ["/path/to/wave-mcp-server/dist/index.js"]
    }
  }
}
```

Or with inline environment variables:

```json
{
  "mcpServers": {
    "wave": {
      "command": "node",
      "args": ["/path/to/wave-mcp-server/dist/index.js"],
      "env": {
        "WAVE_API_KEY": "your_key",
        "WAVE_BUSINESS_ID": "your_id",
        "BUSINESS_NAME": "Your Business Name",
        "LOGO_PATH": "/path/to/assets/logo.png"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `WAVE_API_KEY` | Yes | Your Wave full-access token |
| `WAVE_BUSINESS_ID` | Yes | Your Wave business ID |
| `BUSINESS_NAME` | No | Business name on invoices |
| `BUSINESS_ADDRESS1` | No | Address line 1 |
| `BUSINESS_ADDRESS2` | No | Address line 2 |
| `BUSINESS_PHONE` | No | Phone number |
| `LOGO_PATH` | No | Path to logo PNG (default: `./assets/logo.png`) |
| `INVOICE_OUTPUT_DIR` | No | Output directory for PDFs (default: `./invoices`) |

## Available Tools

| Tool | Description |
| ---- | ----------- |
| `list_invoices` | List invoices with pagination |
| `get_invoice` | Get full invoice details |
| `list_customers` | List all customers |
| `export_invoice_json` | Export invoice as JSON |
| `generate_invoice_pdf` | Generate branded PDF from Wave invoice |

## Usage Examples

Once configured, ask Claude:

- "List my Wave invoices"
- "Generate a PDF for invoice #1234"
- "Show me the details for my latest invoice"

## License

MIT
