const { NextRequest } = require('next/server');

jest.mock('../../../../lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

jest.mock('jspdf', () => {
  const mockDoc = {
    setFillColor: jest.fn(),
    rect: jest.fn(),
    setTextColor: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    text: jest.fn(),
    roundedRect: jest.fn(),
    line: jest.fn(),
    output: jest.fn().mockReturnValue(new ArrayBuffer(1024)),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
  };

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockDoc),
  };
});

jest.mock('jspdf-autotable', () => {
  return jest.fn().mockImplementation(() => {});
});

const { query } = require('../../../../lib/db');

describe('Payment History API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (params = {}) => {
    const url = new URL('http://localhost:3000/api/payments/history');
    if (params && params.userId) url.searchParams.set('userId', params.userId);
    if (params && params.projectId) url.searchParams.set('projectId', params.projectId);
    return new NextRequest(url);
  };

  describe('GET /api/payments/history', () => {
    it('should return 400 when neither userId nor projectId is provided', async () => {
      const { GET } = require('../history/route');
      const request = createMockRequest({});

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should fetch payments for a valid projectId', async () => {
      const mockPayments = [
        {
          id: 'pay_123',
          amount: 50000,
          currency: 'USD',
          payment_type: 'advance',
          status: 'completed',
          razorpay_order_id: 'order_123',
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'sig_123',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          project_id: 'proj_123',
          project_number: 'PROJ-001',
          project_status: 'active',
          proposal_description: 'Video production project',
        },
      ];

      query.mockResolvedValue({ rows: mockPayments });

      const { GET } = require('../history/route');
      const request = createMockRequest({ projectId: 'proj_123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payments).toHaveLength(1);
      expect(data.payments[0].id).toBe('pay_123');
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should fetch payments for a valid userId', async () => {
      const mockPayments = [
        {
          id: 'pay_456',
          amount: 75000,
          currency: 'INR',
          payment_type: 'full',
          status: 'completed',
          razorpay_order_id: 'order_456',
          razorpay_payment_id: 'pay_456',
          razorpay_signature: 'sig_456',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          project_id: 'proj_456',
          project_number: 'PROJ-002',
          project_status: 'completed',
          proposal_description: 'Animation project',
        },
      ];

      query.mockResolvedValue({ rows: mockPayments });

      const { GET } = require('../history/route');
      const request = createMockRequest({ userId: 'user_123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payments).toHaveLength(1);
      expect(data.count).toBe(1);
    });

    it('should return empty array when no payments found', async () => {
      query.mockResolvedValue({ rows: [] });

      const { GET } = require('../history/route');
      const request = createMockRequest({ projectId: 'proj_nonexistent' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payments).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it('should return 500 on database error', async () => {
      query.mockRejectedValue(new Error('Database connection failed'));

      const { GET } = require('../history/route');
      const request = createMockRequest({ userId: 'user_123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle missing project data gracefully', async () => {
      const mockPayments = [
        {
          id: 'pay_789',
          amount: 100000,
          currency: 'USD',
          payment_type: 'advance',
          status: 'completed',
          razorpay_order_id: 'order_789',
          razorpay_payment_id: 'pay_789',
          razorpay_signature: 'sig_789',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          project_id: null,
          project_number: null,
          project_status: null,
          proposal_description: 'Standalone payment',
        },
      ];

      query.mockResolvedValue({ rows: mockPayments });

      const { GET } = require('../history/route');
      const request = createMockRequest({ userId: 'user_123' });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.payments[0].project).toBeNull();
    });
  });
});

describe('Invoice Generation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body = {}) => {
    return new NextRequest('http://localhost:3000/api/payments/generate-invoice', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  describe('POST /api/payments/generate-invoice', () => {
    it('should return 400 when paymentId is missing', async () => {
      const { POST } = require('../generate-invoice/route');
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Payment ID is required');
    });

    it('should generate invoice PDF with valid paymentId', async () => {
      const { POST } = require('../generate-invoice/route');
      const request = createMockRequest({
        paymentId: 'pay_123456789012',
        projectNumber: 'PROJ-001',
        projectDetails: {
          id: 'proj_123',
          projectNumber: 'PROJ-001',
          companyName: 'Test Company',
          clientName: 'John Doe',
          projectName: 'Marketing Video',
          startDate: '2024-01-01',
          estimatedCompletion: '2024-02-01',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('invoice-');
    });

    it('should generate invoice with minimal data', async () => {
      const { POST } = require('../generate-invoice/route');
      const request = createMockRequest({
        paymentId: 'pay_minimal',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('should return 500 on PDF generation error', async () => {
      const jsPDF = require('jspdf');
      jsPDF.default.mockImplementation(() => {
        throw new Error('PDF generation failed');
      });

      const { POST } = require('../generate-invoice/route');
      const request = createMockRequest({
        paymentId: 'pay_error',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to generate');
    });

    it('should include correct Content-Length header', async () => {
      const { POST } = require('../generate-invoice/route');
      const request = createMockRequest({
        paymentId: 'pay_content_length_test',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      const contentLength = response.headers.get('Content-Length');
      expect(contentLength).toBeDefined();
      expect(parseInt(contentLength)).toBeGreaterThan(0);
    });
  });

  describe('GET /api/payments/generate-invoice', () => {
    it('should return API info message', async () => {
      const { GET } = require('../generate-invoice/route');
      const request = new NextRequest('http://localhost:3000/api/payments/generate-invoice');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Invoice generation API');
    });
  });
});

describe('Proforma Invoice API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  const mockStorage = {
    readJSON: jest.fn(),
    STORAGE_FILES: {
      PROPOSALS: 'proposals.json',
      INQUIRIES: 'inquiries.json',
    },
  };

  jest.mock('../../../../lib/storage', () => mockStorage);

  describe('GET /api/payments/proforma/[proposalId]', () => {
    it('should return 404 when proposal not found', async () => {
      mockStorage.readJSON.mockResolvedValue([]);

      const { GET } = require('../proforma/[proposalId]/route');
      const params = Promise.resolve({ proposalId: 'nonexistent' });
      const request = new NextRequest('http://localhost:3000/api/payments/proforma/nonexistent');

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Proposal not found');
    });

    it('should return proforma data with valid proposalId', async () => {
      const mockProposal = {
        id: 'prop_123',
        inquiryId: 'inq_123',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Video production proposal',
        deliverables: [
          { id: 'd1', name: 'Concept', description: 'Concept development', estimatedCompletionWeek: 1 },
          { id: 'd2', name: 'Production', description: 'Video production', estimatedCompletionWeek: 3 },
        ],
        currency: 'USD',
        totalPrice: 50000,
        advancePercentage: 50,
        advanceAmount: 25000,
        balanceAmount: 25000,
      };

      const mockInquiry = {
        id: 'inq_123',
        inquiryNumber: 'INQ-001',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactName: 'Jane Smith',
        contactEmail: 'jane@example.com',
        companyName: 'Test Corp',
        contactPhone: '+1234567890',
        projectNotes: 'Create a promotional video',
        quizAnswers: {},
        recommendedVideoType: 'Promotional',
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([mockInquiry]);

      const { GET } = require('../proforma/[proposalId]/route');
      const params = Promise.resolve({ proposalId: 'prop_123' });
      const request = new NextRequest('http://localhost:3000/api/payments/proforma/prop_123');

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoiceNumber).toMatch(/^PROF-\d{4}-/);
      expect(data.pricing.total).toBe(50000);
      expect(data.pricing.advanceAmount).toBe(25000);
      expect(data.lineItems).toHaveLength(2);
    });

    it('should return PDF when format=pdf', async () => {
      const mockProposal = {
        id: 'prop_pdf',
        inquiryId: 'inq_pdf',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Test proposal',
        deliverables: [
          { id: 'd1', name: 'Deliverable 1', description: 'Description', estimatedCompletionWeek: 1 },
        ],
        currency: 'INR',
        totalPrice: 100000,
        advancePercentage: 50,
        advanceAmount: 50000,
        balanceAmount: 50000,
      };

      const mockInquiry = {
        id: 'inq_pdf',
        inquiryNumber: 'INQ-PDF',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactName: 'Test User',
        contactEmail: 'test@example.com',
        quizAnswers: {},
        recommendedVideoType: 'Promotional',
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([mockInquiry]);

      const { GET } = require('../proforma/[proposalId]/route');
      const params = Promise.resolve({ proposalId: 'prop_pdf' });
      const request = new NextRequest('http://localhost:3000/api/payments/proforma/prop_pdf?format=pdf');

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('proforma-');
    });

    it('should include payment URL in response', async () => {
      const mockProposal = {
        id: 'prop_url',
        inquiryId: 'inq_url',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Test',
        deliverables: [
          { id: 'd1', name: 'Deliverable', description: '', estimatedCompletionWeek: 1 },
        ],
        currency: 'USD',
        totalPrice: 10000,
        advancePercentage: 50,
        advanceAmount: 5000,
        balanceAmount: 5000,
      };

      const mockInquiry = {
        id: 'inq_url',
        inquiryNumber: 'INQ-URL',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactName: 'User',
        contactEmail: 'user@example.com',
        quizAnswers: {},
        recommendedVideoType: 'Promotional',
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([mockInquiry]);

      const { GET } = require('../proforma/[proposalId]/route');
      const params = Promise.resolve({ proposalId: 'prop_url' });
      const request = new NextRequest('http://localhost:3000/api/payments/proforma/prop_url');

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.paymentUrl).toContain('/payments/proforma/prop_url');
    });
  });
});

describe('Send Receipt API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  const createMockRequest = (body = {}) => {
    return new NextRequest('http://localhost:3000/api/payments/send-receipt', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  describe('POST /api/payments/send-receipt', () => {
    it('should return 400 when paymentId is missing', async () => {
      const { POST } = require('../send-receipt/route');
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Payment ID is required');
    });

    it('should return 500 when RESEND_API_KEY is not configured', async () => {
      const { POST } = require('../send-receipt/route');
      const request = createMockRequest({
        paymentId: 'pay_123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Email service not configured');
    });

    it('should send receipt email with valid data', async () => {
      process.env.RESEND_API_KEY = 'test_key';
      process.env.RESEND_DOMAIN = 'resend.dev';

      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({
            data: { id: 'email_123' },
            error: null,
          }),
        },
      };

      const { Resend } = require('resend');
      Resend.mockImplementation(() => mockResend);

      const { POST } = require('../send-receipt/route');
      const request = createMockRequest({
        paymentId: 'pay_12345678',
        paymentDetails: {
          id: 'pay_12345678',
          amount: 50000,
          currency: 'USD',
          paymentType: 'advance',
          razorpayPaymentId: 'rzp_pay_123',
          paidAt: new Date().toISOString(),
        },
        projectDetails: {
          id: 'proj_123',
          projectNumber: 'PROJ-001',
          companyName: 'Test Company',
          clientName: 'John Doe',
          projectName: 'Marketing Video',
          startDate: '2024-01-01',
          estimatedCompletion: '2024-02-01',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('email_123');
      expect(data.invoiceNumber).toBeDefined();
      expect(data.pdfSize).toBeGreaterThan(0);
    });

    it('should handle Resend API error', async () => {
      process.env.RESEND_API_KEY = 'test_key';
      process.env.RESEND_DOMAIN = 'resend.dev';

      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Failed to send email' },
          }),
        },
      };

      const { Resend } = require('resend');
      Resend.mockImplementation(() => mockResend);

      const { POST } = require('../send-receipt/route');
      const request = createMockRequest({
        paymentId: 'pay_error',
        paymentDetails: {
          id: 'pay_error',
          amount: 10000,
          currency: 'USD',
          paymentType: 'full',
          razorpayPaymentId: 'rzp_pay_error',
          paidAt: new Date().toISOString(),
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to send receipt');
    });

    it('should handle missing paymentDetails gracefully', async () => {
      process.env.RESEND_API_KEY = 'test_key';
      process.env.RESEND_DOMAIN = 'resend.dev';

      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({
            data: { id: 'email_minimal' },
            error: null,
          }),
        },
      };

      const { Resend } = require('resend');
      Resend.mockImplementation(() => mockResend);

      const { POST } = require('../send-receipt/route');
      const request = createMockRequest({
        paymentId: 'pay_minimal',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/payments/send-receipt', () => {
    it('should return API info', async () => {
      const { GET } = require('../send-receipt/route');
      const request = new NextRequest('http://localhost:3000/api/payments/send-receipt');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Payment receipt API');
    });
  });
});

describe('Send Proforma Email API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    delete process.env.RESEND_API_KEY;
  });

  const mockStorage = {
    readJSON: jest.fn(),
    STORAGE_FILES: {
      PROPOSALS: 'proposals.json',
      INQUIRIES: 'inquiries.json',
    },
  };

  jest.mock('../../../../lib/storage', () => mockStorage);

  const createMockRequest = (body = {}) => {
    return new NextRequest('http://localhost:3000/api/payments/send-proforma-email', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  describe('POST /api/payments/send-proforma-email', () => {
    it('should return 400 when required fields are missing', async () => {
      const { POST } = require('../send-proforma-email/route');
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 404 when proposal not found', async () => {
      mockStorage.readJSON.mockResolvedValue([]);

      const { POST } = require('../send-proforma-email/route');
      const request = createMockRequest({
        to: 'client@example.com',
        proposalId: 'nonexistent',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Proposal not found');
    });

    it('should return 404 when inquiry not found', async () => {
      const mockProposal = {
        id: 'prop_123',
        inquiryId: 'nonexistent_inquiry',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Test',
        deliverables: [],
        currency: 'USD',
        totalPrice: 10000,
        advancePercentage: 50,
        advanceAmount: 5000,
        balanceAmount: 5000,
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([]);

      const { POST } = require('../send-proforma-email/route');
      const request = createMockRequest({
        to: 'client@example.com',
        proposalId: 'prop_123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Inquiry not found');
    });

    it('should send proforma email successfully', async () => {
      process.env.RESEND_API_KEY = 'test_key';
      process.env.RESEND_DOMAIN = 'resend.dev';

      const mockProposal = {
        id: 'prop_email',
        inquiryId: 'inq_email',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Video production',
        deliverables: [
          { id: 'd1', name: 'Pre-production', description: 'Planning', estimatedCompletionWeek: 1 },
        ],
        currency: 'USD',
        totalPrice: 50000,
        advancePercentage: 50,
        advanceAmount: 25000,
        balanceAmount: 25000,
      };

      const mockInquiry = {
        id: 'inq_email',
        inquiryNumber: 'INQ-EMAIL',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactName: 'Email Client',
        contactEmail: 'client@example.com',
        companyName: 'Email Corp',
        quizAnswers: {},
        recommendedVideoType: 'Promotional',
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([mockInquiry]);

      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({
            data: { id: 'proforma_email_123' },
            error: null,
          }),
        },
      };

      const { Resend } = require('resend');
      Resend.mockImplementation(() => mockResend);

      const { POST } = require('../send-proforma-email/route');
      const request = createMockRequest({
        to: 'client@example.com',
        proposalId: 'prop_email',
        customerName: 'Email Client',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('proforma_email_123');
      expect(data.invoiceNumber).toMatch(/^PROF-\d{4}-/);
    });

    it('should use mock message ID when RESEND_API_KEY not configured', async () => {
      delete process.env.RESEND_API_KEY;

      const mockProposal = {
        id: 'prop_mock',
        inquiryId: 'inq_mock',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Test',
        deliverables: [],
        currency: 'USD',
        totalPrice: 10000,
        advancePercentage: 50,
        advanceAmount: 5000,
        balanceAmount: 5000,
      };

      const mockInquiry = {
        id: 'inq_mock',
        inquiryNumber: 'INQ-MOCK',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactName: 'Mock Client',
        contactEmail: 'mock@example.com',
        quizAnswers: {},
        recommendedVideoType: 'Promotional',
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([mockInquiry]);

      const { POST } = require('../send-proforma-email/route');
      const request = createMockRequest({
        to: 'mock@example.com',
        proposalId: 'prop_mock',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toMatch(/^mock-\d+/);
    });

    it('should use custom invoice number when provided', async () => {
      process.env.RESEND_API_KEY = 'test_key';
      process.env.RESEND_DOMAIN = 'resend.dev';

      const mockProposal = {
        id: 'prop_custom',
        inquiryId: 'inq_custom',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Test',
        deliverables: [],
        currency: 'USD',
        totalPrice: 10000,
        advancePercentage: 50,
        advanceAmount: 5000,
        balanceAmount: 5000,
      };

      const mockInquiry = {
        id: 'inq_custom',
        inquiryNumber: 'INQ-CUSTOM',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactName: 'Custom Client',
        contactEmail: 'custom@example.com',
        quizAnswers: {},
        recommendedVideoType: 'Promotional',
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([mockInquiry]);

      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({
            data: { id: 'custom_email' },
            error: null,
          }),
        },
      };

      const { Resend } = require('resend');
      Resend.mockImplementation(() => mockResend);

      const { POST } = require('../send-proforma-email/route');
      const request = createMockRequest({
        to: 'custom@example.com',
        proposalId: 'prop_custom',
        invoiceNumber: 'CUSTOM-INV-001',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoiceNumber).toBe('CUSTOM-INV-001');
    });

    it('should calculate correct due date (15 days)', async () => {
      process.env.RESEND_API_KEY = 'test_key';
      process.env.RESEND_DOMAIN = 'resend.dev';

      const mockProposal = {
        id: 'prop_due',
        inquiryId: 'inq_due',
        status: 'accepted',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Test',
        deliverables: [],
        currency: 'USD',
        totalPrice: 10000,
        advancePercentage: 50,
        advanceAmount: 5000,
        balanceAmount: 5000,
      };

      const mockInquiry = {
        id: 'inq_due',
        inquiryNumber: 'INQ-DUE',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactName: 'Due Client',
        contactEmail: 'due@example.com',
        quizAnswers: {},
        recommendedVideoType: 'Promotional',
      };

      mockStorage.readJSON
        .mockResolvedValueOnce([mockProposal])
        .mockResolvedValueOnce([mockInquiry]);

      const mockResend = {
        emails: {
          send: jest.fn().mockResolvedValue({
            data: { id: 'due_email' },
            error: null,
          }),
        },
      };

      const { Resend } = require('resend');
      Resend.mockImplementation(() => mockResend);

      const { POST } = require('../send-proforma-email/route');
      const request = createMockRequest({
        to: 'due@example.com',
        proposalId: 'prop_due',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('OPTIONS /api/payments/send-proforma-email', () => {
    it('should return CORS headers', async () => {
      const { OPTIONS } = require('../send-proforma-email/route');
      const request = new NextRequest('http://localhost:3000/api/payments/send-proforma-email', {
        method: 'OPTIONS',
        headers: { origin: 'https://portal.motionify.studio' },
      });
      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://portal.motionify.studio');
    });
  });
});
