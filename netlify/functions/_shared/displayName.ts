/**
 * Display Name Masking
 *
 * When the requesting user is a client, support user names are
 * replaced with "Motionify Support" so clients see a single
 * branded identity instead of individual support staff names.
 */

export function maskSupportName(
  name: string,
  memberRole: string,
  requesterRole: string
): string {
  if (requesterRole === 'client' && memberRole === 'support') {
    return 'Motionify Support';
  }
  return name;
}
