import { FastifyInstance } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import { db, users, sessions, members } from '../db/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { SESSION_COOKIE } from '../plugins/session.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function getGoogleRedirectUri(): string {
  return process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:3000/api/v1/auth/google/callback';
}

export async function authRoutes(fastify: FastifyInstance) {
  // Redirect to Google consent screen
  fastify.get('/api/v1/auth/google', async (request, reply) => {
    const { redirect } = request.query as { redirect?: string };
    const state = randomBytes(16).toString('base64url');

    // Store state + redirect target in a short-lived cookie for CSRF validation
    reply.setCookie('oauth_state', JSON.stringify({ state, redirect: redirect ?? '/' }), {
      httpOnly: true,
      path: '/',
      sameSite: process.env['NODE_ENV'] === 'prod' ? 'none' : 'lax',
      secure: process.env['NODE_ENV'] === 'prod',
      maxAge: 600, // 10 minutes
    });

    const params = new URLSearchParams({
      client_id: process.env['GOOGLE_CLIENT_ID'] ?? '',
      redirect_uri: getGoogleRedirectUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  // Google OAuth callback
  fastify.get('/api/v1/auth/google/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    if (!code || !state) {
      return reply.status(400).send({ error: 'Missing code or state' });
    }

    // Validate CSRF state
    const oauthCookie = request.cookies['oauth_state'];
    if (!oauthCookie) {
      return reply.status(400).send({ error: 'Missing OAuth state cookie' });
    }

    let storedState: { state: string; redirect: string };
    try {
      storedState = JSON.parse(oauthCookie);
    } catch {
      return reply.status(400).send({ error: 'Invalid OAuth state cookie' });
    }

    if (storedState.state !== state) {
      return reply.status(400).send({ error: 'State mismatch' });
    }

    // Clear the oauth state cookie
    reply.clearCookie('oauth_state', { path: '/' });

    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env['GOOGLE_CLIENT_ID'] ?? '',
        client_secret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
        redirect_uri: getGoogleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return reply.status(400).send({ error: 'Failed to exchange code for tokens' });
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    // Fetch user profile
    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      return reply.status(400).send({ error: 'Failed to fetch user profile' });
    }

    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    // Upsert user
    const [user] = await db
      .insert(users)
      .values({
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture ?? null,
        googleId: profile.id,
      })
      .onConflictDoUpdate({
        target: users.googleId,
        set: {
          name: profile.name,
          avatarUrl: profile.picture ?? null,
          email: profile.email,
        },
      })
      .returning();

    if (!user) {
      return reply.status(500).send({ error: 'Failed to create user' });
    }

    // Merge any guest member records from the current browser session
    const guestToken = request.cookies[SESSION_COOKIE];
    if (guestToken) {
      const guestHash = hashToken(guestToken);
      const guestMembers = await db
        .select()
        .from(members)
        .where(and(eq(members.sessionToken, guestHash), isNull(members.leftAt)));

      for (const guestMember of guestMembers) {
        // Check if this Google user is already a member of this group
        const [existing] = await db
          .select()
          .from(members)
          .where(and(eq(members.userId, user.id), eq(members.groupId, guestMember.groupId), isNull(members.leftAt)));

        if (existing) {
          // Drop the guest record — the authenticated member takes precedence
          await db.update(members).set({ leftAt: new Date() }).where(eq(members.id, guestMember.id));
        } else {
          // Link the guest member record to the Google account
          await db.update(members).set({ userId: user.id, sessionToken: null }).where(eq(members.id, guestMember.id));
        }
      }
    }

    // Create session
    const sessionToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Set session cookie
    reply.setCookie(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: process.env['NODE_ENV'] === 'prod' ? 'none' : 'lax',
      secure: process.env['NODE_ENV'] === 'prod',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect to the original page
    const frontendOrigin = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
    return reply.redirect(`${frontendOrigin}${storedState.redirect}`);
  });

  // Get current user
  fastify.get('/api/v1/auth/me', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
    return {
      id: request.user.id,
      email: request.user.email,
      name: request.user.name,
      avatarUrl: request.user.avatarUrl,
    };
  });

  // Test-only login bypass (dev/test environments only)
  if (process.env['NODE_ENV'] !== 'prod') {
    fastify.post('/api/v1/auth/test-login', async (request, reply) => {
      const { name, email } = request.body as { name?: string; email?: string };
      const testEmail = email ?? `test-${randomBytes(4).toString('hex')}@test.local`;
      const testName = name ?? 'Test User';
      const testGoogleId = `test-${createHash('sha256').update(testEmail).digest('hex').slice(0, 20)}`;

      // Upsert test user
      const [user] = await db
        .insert(users)
        .values({
          email: testEmail,
          name: testName,
          avatarUrl: null,
          googleId: testGoogleId,
        })
        .onConflictDoUpdate({
          target: users.googleId,
          set: { name: testName, email: testEmail },
        })
        .returning();

      if (!user) {
        return reply.status(500).send({ error: 'Failed to create test user' });
      }

      // Create session
      const sessionToken = randomBytes(32).toString('base64url');
      const tokenHash = hashToken(sessionToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

      await db.insert(sessions).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      reply.setCookie(SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 24,
      });

      return { id: user.id, email: user.email, name: user.name };
    });
  }

  // Logout
  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      const tokenHash = hashToken(token);
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    }

    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.status(204).send();
  });
}
