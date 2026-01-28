import { GraphQLClient, gql } from "graphql-request";

const WAVE_ENDPOINT = "https://gql.waveapps.com/graphql/public";

export class WaveClient {
  private client: GraphQLClient;
  private businessId: string;

  constructor(apiKey: string, businessId: string) {
    this.businessId = businessId;
    this.client = new GraphQLClient(WAVE_ENDPOINT, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }

  async listInvoices(page = 1, pageSize = 25) {
    const query = gql`
      query ListInvoices($businessId: ID!, $page: Int!, $pageSize: Int!) {
        business(id: $businessId) {
          invoices(page: $page, pageSize: $pageSize) {
            edges {
              node {
                id
                invoiceNumber
                status
                invoiceDate
                dueDate
                amountDue { value currency { code } }
                customer { name email }
              }
            }
            pageInfo { totalPages currentPage }
          }
        }
      }
    `;
    return this.client.request(query, { 
      businessId: this.businessId, page, pageSize 
    });
  }

  async getInvoice(invoiceId: string) {
    const query = gql`
      query GetInvoice($businessId: ID!, $invoiceId: ID!) {
        business(id: $businessId) {
          invoice(id: $invoiceId) {
            id
            invoiceNumber
            status
            invoiceDate
            dueDate
            memo
            amountDue { value currency { code } }
            amountPaid { value }
            customer {
              name
              email
              address { city province { code } postalCode country { code } }
            }
            items {
              description
              quantity
              unitPrice
              amount { value }
              product { name }
            }
          }
        }
      }
    `;
    return this.client.request(query, { businessId: this.businessId, invoiceId });
  }

  async listCustomers() {
    const query = gql`
      query ListCustomers($businessId: ID!) {
        business(id: $businessId) {
          customers(page: 1, pageSize: 100) {
            edges {
              node { id name email }
            }
          }
        }
      }
    `;
    return this.client.request(query, { businessId: this.businessId });
  }
}
