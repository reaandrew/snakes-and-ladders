export function validateAdminAuth(authHeader: string | undefined): boolean {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return false;
  }

  if (!authHeader?.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.slice(6);
  const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const expectedCredentials = `${adminUsername}:${adminPassword}`;

  return decoded === expectedCredentials;
}
