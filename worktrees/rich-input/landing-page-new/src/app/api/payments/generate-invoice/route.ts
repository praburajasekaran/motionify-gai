import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceRequest {
  paymentId: string;
  projectNumber?: string;
  projectDetails?: {
    id: string;
    projectNumber: string;
    companyName: string;
    clientName: string;
    projectName: string;
    startDate: string;
    estimatedCompletion: string;
  };
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateInvoicePdf(
  paymentId: string,
  projectNumber: string | undefined,
  projectDetails: InvoiceRequest['projectDetails']
): Buffer {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [124, 58, 237];

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 45, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Motionify', 20, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Video Production', 20, 35);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', 150, 28);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const receiptDate = new Date().toISOString();
  doc.text(`Receipt Date: ${formatDate(receiptDate)}`, 150, 38);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Confirmed!', 20, 65);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your payment. This is your official receipt.', 20, 73);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', 20, 95);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(projectDetails?.clientName || 'Valued Client', 20, 103);
  if (projectDetails?.companyName) {
    doc.text(projectDetails.companyName, 20, 110);
  }

  const invoiceNumber = `INV-${paymentId.substring(0, 8).toUpperCase()}`;
  doc.text(`Invoice #: ${invoiceNumber}`, 130, 95);
  doc.text(`Project #: ${projectNumber || projectDetails?.projectNumber || 'N/A'}`, 130, 103);
  doc.text(`Payment ID: ${paymentId.substring(0, 16)}...`, 130, 111);

  const lineItems: InvoiceItem[] = [
    {
      description: `${projectDetails?.projectName || 'Video Production Project'} - Advance Payment`,
      quantity: 1,
      unitPrice: 0,
      amount: 0
    }
  ];

  autoTable(doc, {
    startY: 130,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: lineItems.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice, 'USD'),
      formatCurrency(item.amount, 'USD')
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [124, 58, 237] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 180;

  const summaryX = 130;
  let summaryY = finalY + 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(formatCurrency(0, 'USD'), 190, summaryY, { align: 'right' });

  summaryY += 7;
  doc.text('Tax:', summaryX, summaryY);
  doc.text(formatCurrency(0, 'USD'), 190, summaryY, { align: 'right' });

  summaryY += 10;
  doc.setFillColor(124, 58, 237);
  doc.roundedRect(summaryX - 5, summaryY - 5, 65, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Paid:', summaryX + 2, summaryY + 3);
  doc.text(formatCurrency(0, 'USD'), 190, summaryY + 3, { align: 'right' });

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Method: Razorpay (Online Transfer)', 20, 250);
  doc.text(`Payment Status: Completed`, 20, 257);

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 265, 190, 265);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for choosing Motionify for your video production needs!', 105, 275, { align: 'center' });
  doc.text('This is a computer-generated receipt. No signature required.', 105, 282, { align: 'center' });
  doc.text(`Generated on ${formatDate(receiptDate)} | Motionify | hello@motionify.com`, 105, 289, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST(request: NextRequest) {
  try {
    const body: InvoiceRequest = await request.json();
    const { paymentId, projectNumber, projectDetails } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const pdfBuffer = generateInvoicePdf(paymentId, projectNumber, projectDetails);

    const invoiceNumber = `invoice-${projectNumber || paymentId.substring(0, 8)}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceNumber}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GenerateInvoice] Error generating invoice PDF:', error);

    return NextResponse.json(
      { error: 'Failed to generate invoice', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Invoice generation API - Use POST to generate PDF invoices'
  });
}
