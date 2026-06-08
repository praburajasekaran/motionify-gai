import Razorpay from 'razorpay';
import { query as dbQuery, transaction } from './_shared/db';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';
import { sendPaymentReminderEmail } from './send-email';
import { acceptProposalAndCreateProject } from './_shared/proposal-payment-helpers';
import {
  AuthorizationError,
  assertAdminLike,
  createAuthorizationResponse,
  getAuthRole,
  logAuthorizationDenied,
  requirePaymentAccess,
  requireProjectAccess,
  requireProposalAccess,
} from './_shared/authorization';
import { isAdminLike, isClientLike } from './_shared/roles';
import { verifyRazorpayCheckoutSignature } from './_shared/payment-verification';
import { absolutePortalProjectUrl, absoluteUrl, appOriginFromEnv, portalPath } from '../../shared/canonical-links';

async function logActivity(params: {
  type: string;
  userId: string;
  userName: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details?: Record<string, string | number>;
}) {
  try {
    await dbQuery(
      `INSERT INTO activities (type, user_id, user_name, inquiry_id, proposal_id, project_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [params.type, params.userId, params.userName,
       params.inquiryId || null, params.proposalId || null, params.projectId || null,
       JSON.stringify(params.details || {})]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

function getRazorpayClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
  });
}

function createPaymentError(statusCode: number, message: string) {
  const error = new Error(message);
  (error as any).statusCode = statusCode;
  return error;
}

function getPaymentsPathSegments(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const paymentsIndex = parts.lastIndexOf('payments');
  return paymentsIndex >= 0 ? parts.slice(paymentsIndex + 1) : [];
}

function serializeDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapAdminPayment(row: any) {
  return {
    id: row.id,
    amount: Number(row.amount ?? 0),
    currency: row.currency,
    paymentType: row.payment_type,
    status: row.status,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    paidAt: serializeDate(row.paid_at),
    createdAt: serializeDate(row.created_at),
    projectId: row.project_id,
    projectNumber: row.project_number,
    projectStatus: row.project_status,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
  };
}

function buildAdminPaymentFilters(queryStringParameters: Record<string, string> | undefined) {
  const { status, dateFrom, dateTo, clientName, projectSearch } = queryStringParameters || {};
  const clauses: string[] = [];
  const params: any[] = [];

  const addParam = (value: any) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (status && status !== 'all') {
    clauses.push(`pay.status = ${addParam(status)}`);
  }

  if (dateFrom) {
    clauses.push(`pay.created_at >= ${addParam(dateFrom)}::date`);
  }

  if (dateTo) {
    clauses.push(`pay.created_at < (${addParam(dateTo)}::date + INTERVAL '1 day')`);
  }

  if (clientName) {
    const placeholder = addParam(`%${clientName}%`);
    clauses.push(`(
      u.full_name ILIKE ${placeholder}
      OR u.email ILIKE ${placeholder}
      OR i.contact_name ILIKE ${placeholder}
      OR i.contact_email ILIKE ${placeholder}
    )`);
  }

  if (projectSearch) {
    const placeholder = addParam(`%${projectSearch}%`);
    clauses.push(`(
      proj.project_number ILIKE ${placeholder}
      OR i.inquiry_number ILIKE ${placeholder}
    )`);
  }

  return {
    params,
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
  };
}

export function buildAdminPaymentsQuery(queryStringParameters: Record<string, string> | undefined) {
  const { whereClause, params } = buildAdminPaymentFilters(queryStringParameters);

  return {
    params,
    text: `SELECT
       pay.id,
       pay.amount,
       pay.currency,
       pay.payment_type,
       pay.status,
       pay.razorpay_order_id,
       pay.razorpay_payment_id,
       pay.paid_at,
       pay.created_at,
       COALESCE(pay.project_id, proj.id) AS project_id,
       proj.project_number,
       proj.status AS project_status,
       u.id AS client_id,
       COALESCE(u.full_name, i.contact_name) AS client_name,
       COALESCE(u.email, i.contact_email) AS client_email
     FROM payments pay
     LEFT JOIN proposals prop ON pay.proposal_id = prop.id
     LEFT JOIN inquiries i ON prop.inquiry_id = i.id
     LEFT JOIN LATERAL (
       SELECT
         p.id,
         p.project_number,
         p.status,
         p.client_user_id
       FROM projects p
       WHERE p.id = pay.project_id OR (
         pay.project_id IS NULL
         AND pay.proposal_id IS NOT NULL
         AND p.proposal_id = pay.proposal_id
       )
       ORDER BY
         CASE WHEN p.id = pay.project_id THEN 0 ELSE 1 END,
         p.created_at DESC,
         p.id
       LIMIT 1
     ) proj ON TRUE
     LEFT JOIN users u ON proj.client_user_id = u.id
     ${whereClause}
     ORDER BY pay.created_at DESC`,
  };
}

async function handleAdminProjects(headers: Record<string, string>) {
  const result = await dbQuery(
    `SELECT
       p.id,
       p.project_number,
       COALESCE(u.full_name, i.contact_name, 'Unknown client') AS client_name
     FROM projects p
     LEFT JOIN users u ON p.client_user_id = u.id
     LEFT JOIN inquiries i ON p.inquiry_id = i.id
     WHERE p.status NOT IN ('archived', 'cancelled')
     ORDER BY p.created_at DESC`
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.rows.map((row: any) => ({
      id: row.id,
      projectNumber: row.project_number,
      clientName: row.client_name,
    }))),
  };
}

async function handleAdminPayments(
  event: NetlifyEvent,
  headers: Record<string, string>
) {
  const query = buildAdminPaymentsQuery(event.queryStringParameters);

  const result = await dbQuery(
    query.text,
    query.params
  );

  const payments = result.rows.map(mapAdminPayment);
  const summary = payments.reduce(
    (acc, payment) => {
      acc.totalAmount += payment.amount;
      acc.totalCount += 1;
      if (payment.status === 'completed') acc.completedAmount += payment.amount;
      if (payment.status === 'pending') acc.pendingAmount += payment.amount;
      if (payment.status === 'failed') acc.failedCount += 1;
      return acc;
    },
    {
      totalAmount: 0,
      pendingAmount: 0,
      completedAmount: 0,
      failedCount: 0,
      totalCount: 0,
      currency: payments[0]?.currency || 'INR',
    }
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      payments,
      summary,
      count: payments.length,
    }),
  };
}

export const handler = compose(
  withCORS(['GET', 'POST']),
  withAuth(),
  withRateLimit(RATE_LIMITS.apiStrict, 'payments')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  try {
    if (event.httpMethod === 'GET') {
      const pathSegments = getPaymentsPathSegments(event.path);
      const isAdminRequest = pathSegments[0] === 'admin';

      if (isAdminRequest) {
        assertAdminLike(auth?.user, 'payments.admin');

        if (pathSegments[1] === 'projects') {
          return handleAdminProjects(headers);
        }

        return handleAdminPayments(event, headers);
      }

      const { proposalId, projectId } = event.queryStringParameters || {};

      let sql = 'SELECT * FROM payments ORDER BY created_at DESC';
      const params: any[] = [];

      if (proposalId) {
        await requireProposalAccess(auth?.user, proposalId, { operation: 'payments.listByProposal' });
        sql = 'SELECT * FROM payments WHERE proposal_id = $1 ORDER BY created_at DESC';
        params.push(proposalId);
      } else if (projectId) {
        await requireProjectAccess(auth?.user, projectId, { operation: 'payments.listByProject' });
        sql = 'SELECT * FROM payments WHERE project_id = $1 ORDER BY created_at DESC';
        params.push(projectId);
      } else if (!isAdminLike(getAuthRole(auth?.user))) {
        sql = `
          SELECT DISTINCT pay.*
          FROM payments pay
          LEFT JOIN proposals p ON pay.proposal_id = p.id
          LEFT JOIN inquiries i ON p.inquiry_id = i.id
          LEFT JOIN projects pr ON pr.id = pay.project_id OR pr.proposal_id = p.id
          LEFT JOIN project_team pt
            ON pt.project_id = pr.id AND pt.user_id = $1 AND pt.removed_at IS NULL
          WHERE p.client_user_id = $1
             OR pr.client_user_id = $1
             OR LOWER(i.contact_email) = LOWER($2)
             OR pt.user_id = $1
          ORDER BY pay.created_at DESC
        `;
        params.push(auth!.user!.userId, auth!.user!.email);
      }

      const result = await dbQuery(sql, params);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows),
      };
    }

    if (event.httpMethod === 'POST') {
      const pathParts = event.path.split('/');
      const action = pathParts[pathParts.length - 1];

      if (action === 'create-order') {
        const validation = validateRequest(event.body, SCHEMAS.payment.createOrder, origin);
        if (!validation.success) return validation.response;
        const { proposalId, paymentType } = validation.data;

        const requesterRole = getAuthRole(auth?.user);
        if (!isAdminLike(requesterRole) && !isClientLike(requesterRole)) {
          logAuthorizationDenied(auth?.user, 'Payment', proposalId, 'payments.createOrder');
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Access denied' }),
          };
        }

        await requireProposalAccess(auth?.user, proposalId, {
          operation: 'payments.createOrder',
          allowTeam: false,
        });

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Payment provider is not configured' }),
          };
        }

        const proposalResult = await dbQuery(
          'SELECT * FROM proposals WHERE id = $1',
          [proposalId]
        );

        if (proposalResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Proposal not found' }),
          };
        }

        const proposal = proposalResult.rows[0];
        const amount = paymentType === 'advance' ? proposal.advance_amount : proposal.balance_amount;

        // Create Razorpay order
        const orderOptions = {
          amount: amount, // amount in the smallest currency unit
          currency: proposal.currency,
          receipt: `receipt_${proposalId.substring(0, 8)}_${Date.now()}`,
        };

        // Validate amount
        if (!amount || amount <= 0) {
          console.error('Invalid amount:', { amount, advanceAmount: proposal.advance_amount, balanceAmount: proposal.balance_amount });
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid payment amount', details: `Amount: ${amount}` }),
          };
        }

        console.log('Creating Razorpay order:', orderOptions);

        try {
          const razorpayOrder = await getRazorpayClient().orders.create(orderOptions);

          const result = await dbQuery(
            `INSERT INTO payments (
                proposal_id, payment_type, amount, currency, status, razorpay_order_id
              ) VALUES ($1, $2, $3, $4, 'pending', $5)
              RETURNING *`,
            [proposalId, paymentType, amount, proposal.currency, razorpayOrder.id]
          );

          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
              ...result.rows[0],
              razorpayOrderId: razorpayOrder.id,
              razorpayKeyId: process.env.RAZORPAY_KEY_ID,
              amount: amount,
              currency: proposal.currency,
              name: "Motionify Studio",
              description: "Project Payment",
            }),
          };
        } catch (err: any) {
          console.error('Error creating Razorpay order:', err);
          const errorMessage = err?.error?.description || err?.message || 'Unknown Razorpay error';
          const errorCode = err?.error?.code || err?.statusCode || 'UNKNOWN';
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Failed to create payment order',
              details: errorMessage,
              code: errorCode,
              orderOptions: { amount: orderOptions.amount, currency: orderOptions.currency }
            }),
          };
        }
      }

      if (action === 'verify') {
        const validation = validateRequest(event.body, SCHEMAS.payment.verify, origin);
        if (!validation.success) return validation.response;
        const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = validation.data;

        try {
        const { payment, activation } = await transaction(async (client) => {
          const requesterRole = getAuthRole(auth?.user);
          if (!isAdminLike(requesterRole) && !isClientLike(requesterRole)) {
            logAuthorizationDenied(auth?.user, 'Payment', paymentId, 'payments.verify');
            throw createPaymentError(403, 'Access denied');
          }

          await requirePaymentAccess(auth?.user, paymentId, {
            runner: client,
            operation: 'payments.verify',
          });

          const paymentResult = await client.query(
            `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
            [paymentId]
          );
          const currentPayment = paymentResult.rows[0];
          if (!currentPayment) {
            throw createPaymentError(404, 'Payment not found');
          }

          if (currentPayment.razorpay_order_id !== razorpayOrderId) {
            throw createPaymentError(400, 'Payment order does not match the server-created order');
          }

          if (currentPayment.status === 'completed') {
            if (currentPayment.razorpay_payment_id !== razorpayPaymentId) {
              throw createPaymentError(409, 'Payment has already been completed with a different provider payment');
            }
            if (!verifyRazorpayCheckoutSignature({
              orderId: currentPayment.razorpay_order_id,
              paymentId: razorpayPaymentId,
              signature: razorpaySignature,
            })) {
              throw createPaymentError(400, 'Invalid Razorpay signature');
            }
            const activation = await acceptProposalAndCreateProject(client, currentPayment.id);
            return { payment: currentPayment, activation };
          }

          if (!['pending', 'processing'].includes(currentPayment.status)) {
            throw createPaymentError(409, `Cannot verify a ${currentPayment.status} payment`);
          }

          const duplicateProviderPayment = await client.query(
            `SELECT id FROM payments
             WHERE razorpay_payment_id = $1 AND id != $2
             LIMIT 1`,
            [razorpayPaymentId, paymentId]
          );
          if (duplicateProviderPayment.rows.length > 0) {
            throw createPaymentError(409, 'Provider payment is already bound to another payment');
          }

          if (!verifyRazorpayCheckoutSignature({
            orderId: currentPayment.razorpay_order_id,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature,
          })) {
            throw createPaymentError(400, 'Invalid Razorpay signature');
          }

          const result = await client.query(
            `UPDATE payments
             SET razorpay_payment_id = $1,
                 razorpay_signature = $2,
                 status = 'completed',
                 paid_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [razorpayPaymentId, razorpaySignature, paymentId]
          );

          if (result.rows.length === 0) {
            const notFoundError = new Error('Payment not found');
            (notFoundError as any).statusCode = 404;
            throw notFoundError;
          }

          const payment = result.rows[0];
          const activation = await acceptProposalAndCreateProject(client, payment.id);

          if (payment.payment_type === 'advance' && !activation.projectId) {
            throw new Error('Project activation failed after advance payment');
          }

          return { payment, activation };
        });

        if (activation.projectId && activation.created) {
          await logActivity({
            type: 'PROJECT_CREATED',
            userId: auth?.user?.userId || '',
            userName: auth?.user?.fullName || 'System',
            projectId: activation.projectId,
            proposalId: payment.proposal_id || undefined,
            details: {},
          });
        }

        // Log payment received activity
        await logActivity({
          type: 'PAYMENT_RECEIVED',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: activation.projectId || payment.project_id || undefined,
          proposalId: payment.proposal_id || undefined,
          details: { amount: payment.amount, currency: payment.currency, paymentType: payment.payment_type },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...payment,
            project_id: activation.projectId || payment.project_id,
            activation,
          }),
        };
        } catch (verifyError: any) {
          console.error('Payment verification error:', verifyError);
          if (verifyError instanceof AuthorizationError) {
            return createAuthorizationResponse(verifyError, origin);
          }
          if (verifyError?.statusCode === 404) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Payment not found' }),
            };
          }
          if (verifyError?.statusCode) {
            return {
              statusCode: verifyError.statusCode,
              headers,
              body: JSON.stringify({ error: verifyError.message }),
            };
          }
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Payment verification failed',
              details: 'Please retry or contact support',
            }),
          };
        }
      }

      if (action === 'manual-complete') {
        assertAdminLike(auth?.user, 'payments.manualComplete');

        const validation = validateRequest(event.body, SCHEMAS.payment.manualComplete, origin);
        if (!validation.success) return validation.response;
        const { paymentId } = validation.data;

        let payment: any;
        let activation: any;
        try {
          const completed = await transaction(async (client) => {
            const result = await client.query(
              `UPDATE payments
               SET status = 'completed',
                   paid_at = NOW(),
                   notes = 'Marked as paid manually by admin'
               WHERE id = $1
               RETURNING *`,
              [paymentId]
            );

            if (result.rows.length === 0) {
              const notFoundError = new Error('Payment not found');
              (notFoundError as any).statusCode = 404;
              throw notFoundError;
            }

            const payment = result.rows[0];
            const activation = await acceptProposalAndCreateProject(client, payment.id);

            if (payment.payment_type === 'advance' && !activation.projectId) {
              throw new Error('Project activation failed after manual advance payment completion');
            }

            return { payment, activation };
          });
          payment = completed.payment;
          activation = completed.activation;
        } catch (error: any) {
          if (error?.statusCode !== 404) {
            throw error;
          }
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' }),
          };
        }

        if (activation.projectId && activation.created) {
          await logActivity({
            type: 'PROJECT_CREATED',
            userId: auth?.user?.userId || '',
            userName: auth?.user?.fullName || 'Admin',
            projectId: activation.projectId,
            proposalId: payment.proposal_id || undefined,
            details: {},
          });
        }

        // Log payment received activity
        await logActivity({
          type: 'PAYMENT_RECEIVED',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: activation.projectId || payment.project_id || undefined,
          proposalId: payment.proposal_id || undefined,
          details: { amount: payment.amount, paymentType: 'manual' },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...payment,
            project_id: activation.projectId || payment.project_id,
            activation,
          }),
        };
      }

      if (action === 'link-project') {
        assertAdminLike(auth?.user, 'payments.linkProject');

        const body = JSON.parse(event.body || '{}');
        const { paymentId, projectId } = body;

        if (!paymentId || !projectId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'paymentId and projectId are required' }),
          };
        }

        const projectResult = await dbQuery('SELECT id FROM projects WHERE id = $1', [projectId]);
        if (projectResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Project not found' }),
          };
        }

        const result = await dbQuery(
          `UPDATE payments
           SET project_id = $1
           WHERE id = $2
           RETURNING id`,
          [projectId, paymentId]
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' }),
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }

      if (action === 'send-reminder') {
        // Verify admin access for sending reminders
        assertAdminLike(auth?.user, 'payments.sendReminder');

        // Extract paymentId from request body
        const body = JSON.parse(event.body || '{}');
        const { paymentId } = body;

        if (!paymentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'paymentId is required' }),
          };
        }

        // Fetch payment with project and client information
        const paymentResult = await dbQuery(
          `SELECT
            p.id, p.amount, p.currency, p.payment_type, p.status, p.created_at,
            proj.id as project_id, proj.project_number,
            u.id as client_id, u.full_name as client_name, u.email as client_email
          FROM payments p
          LEFT JOIN projects proj ON p.project_id = proj.id
          LEFT JOIN users u ON proj.client_user_id = u.id
          WHERE p.id = $1`,
          [paymentId]
        );

        if (paymentResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Payment not found' }),
          };
        }

        const payment = paymentResult.rows[0];

        // Only send reminders for pending payments
        if (payment.status !== 'pending') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: `Cannot send reminder for ${payment.status} payment` }),
          };
        }

        if (!payment.client_email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No client email associated with this payment' }),
          };
        }

        // Calculate days overdue
        const createdDate = new Date(payment.created_at);
        const now = new Date();
        const daysOverdue = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        // Format amount for display (convert from paise/cents to rupees/dollars)
        const displayAmount = (Number(payment.amount) / 100).toFixed(2);

        // Build payment URL
        const paymentUrl = payment.project_id
          ? absolutePortalProjectUrl(payment.project_id, { tab: 'payments' }, appOriginFromEnv(process.env))
          : absoluteUrl(portalPath(), appOriginFromEnv(process.env));

        // Send the reminder email
        const emailResult = await sendPaymentReminderEmail({
          to: payment.client_email,
          clientName: payment.client_name || 'Client',
          projectNumber: payment.project_number || 'N/A',
          amount: displayAmount,
          currency: payment.currency,
          paymentUrl,
          daysOverdue,
        });

        if (!emailResult) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to send reminder email' }),
          };
        }

        console.log(`[Payments API] Reminder sent to ${payment.client_email} for payment ${paymentId}`);

        // Log activity
        await logActivity({
          type: 'PAYMENT_REMINDER_SENT',
          userId: auth?.user?.userId || '',
          userName: auth?.user?.fullName || 'Unknown',
          projectId: payment.project_id || null,
          proposalId: null,
          details: { clientEmail: payment.client_email },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Reminder sent to ${payment.client_email}`,
            paymentId,
            clientEmail: payment.client_email,
          }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Use /create-order, /verify, /manual-complete, or /send-reminder' }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createAuthorizationResponse(error, origin);
    }
    console.error('Payments API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      }),
    };
  }
});
