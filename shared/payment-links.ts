import { advancePaymentPath, portalProjectPath } from './canonical-links';

export type PaymentLinkKind = 'advance-payment-handoff' | 'portal-project-payment';

export interface PaymentLinkClassification {
  kind: PaymentLinkKind;
  path: string;
}

export function advancePaymentHandoffPath(proposalId: string, token: string): PaymentLinkClassification {
  return {
    kind: 'advance-payment-handoff',
    path: advancePaymentPath(proposalId, { token }),
  };
}

export function projectPaymentPath(projectId: string): PaymentLinkClassification {
  return {
    kind: 'portal-project-payment',
    path: portalProjectPath(projectId, { tab: 'payments' }),
  };
}

export function classifyPaymentLink(input: { proposalId?: string | null; projectId?: string | null; token?: string | null }): PaymentLinkClassification {
  if (input.projectId) {
    return projectPaymentPath(input.projectId);
  }

  if (input.proposalId && input.token) {
    return advancePaymentHandoffPath(input.proposalId, input.token);
  }

  throw new Error('Payment links require either projectId or proposalId with token');
}
