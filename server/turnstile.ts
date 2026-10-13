import { b2Config } from './s3Client.ts';

export async function verifyTurnstileToken(token?: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  // If secret key is not configured, bypass verification
  if (!b2Config.turnstileSecretKey) {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: 'Turnstile verification token is missing' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', b2Config.turnstileSecretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await res.json() as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      return {
        success: false,
        error: `Bot verification failed: ${(data['error-codes'] || []).join(', ') || 'invalid challenge token'}`,
      };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error connecting to Turnstile verification endpoint' };
  }
}
