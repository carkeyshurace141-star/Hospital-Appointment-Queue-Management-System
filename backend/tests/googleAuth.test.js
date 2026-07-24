require('./setup');

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(({ idToken }) => {
      if (idToken === 'valid-google-token') {
        return Promise.resolve({
          getPayload: () => ({
            sub: 'google-uid-123',
            email: 'googleuser@example.com',
            name: 'Google User',
            email_verified: true,
          }),
        });
      }
      return Promise.reject(new Error('invalid token'));
    }),
  })),
}));

const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('POST /api/auth/google', () => {
  test('creates a new user and returns a token on first sign-in (happy path)', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-google-token' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: 'Google User',
      email: 'googleuser@example.com',
    });
  });

  test('logs the same Google user back in on a repeat sign-in', async () => {
    const first = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-google-token' });
    const second = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-google-token' });

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  test('rejects an invalid credential (failure case)', async () => {
    const res = await request(app).post('/api/auth/google').send({ credential: 'bogus-token' });

    expect(res.status).toBe(401);
  });

  test('rejects a request with no credential', async () => {
    const res = await request(app).post('/api/auth/google').send({});

    expect(res.status).toBe(400);
  });
});
