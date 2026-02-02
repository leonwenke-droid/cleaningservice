import createMiddleware from 'next-intl/middleware';
import { routing } from './routing';

export default createMiddleware(routing);

export const config = {
  // Exclude api, auth (callback for magic link), _next, _vercel, and static files
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
