import { createClearAuthCookie } from './_shared/jwt';
import { query } from './_shared/db';
import { createLogger, getCorrelationId } from './_shared/logger';
import { compose, withAuth, withCORS, type AuthResult, type NetlifyEvent } from './_shared/middleware';

export const handler = compose(
    withCORS(['POST']),
    withAuth()
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const logger = createLogger('auth-logout', getCorrelationId(event.headers));

    try {
        await query(
            `DELETE FROM sessions WHERE id = $1 AND user_id = $2`,
            [auth!.user!.sessionId, auth!.user!.userId]
        );

        return {
            statusCode: 200,
            headers: {
                'Set-Cookie': createClearAuthCookie(),
            },
            body: JSON.stringify({ success: true, message: 'Logged out' }),
        };
    } catch (error) {
        logger.error('Failed to revoke session during logout', error, {
            userId: auth?.user?.userId,
            sessionId: auth?.user?.sessionId,
        });
        return {
            statusCode: 500,
            headers: {},
            body: JSON.stringify({
                success: false,
                error: { code: 'LOGOUT_FAILED', message: 'Unable to log out. Please try again.' },
            }),
        };
    }
});
