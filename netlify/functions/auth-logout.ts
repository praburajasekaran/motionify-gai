import { createClearAuthCookie } from './_shared/jwt';
import { compose, withCORS, type NetlifyEvent } from './_shared/middleware';

export const handler = compose(
    withCORS(['POST'])
)(async (event: NetlifyEvent) => {
    return {
        statusCode: 200,
        headers: {
            'Set-Cookie': createClearAuthCookie(),
        },
        body: JSON.stringify({ success: true, message: 'Logged out' }),
    };
});
