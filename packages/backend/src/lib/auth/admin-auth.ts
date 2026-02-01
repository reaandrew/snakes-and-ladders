const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = 'SuperSecure123@';

export function validateAdminAuth(authHeader: string | undefined): boolean {
  if (!authHeader?.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.slice(6);
  const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const expectedCredentials = `${ADMIN_USERNAME}:${ADMIN_PASSWORD}`;

  return decoded === expectedCredentials;
}
