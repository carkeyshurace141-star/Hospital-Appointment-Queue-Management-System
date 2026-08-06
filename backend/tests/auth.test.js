require('./setup');
const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const { sendMail } = require('../src/config/mailer');

jest.mock('../src/config/mailer', () => ({ sendMail: jest.fn() }));

const app = createApp();

const validSignupBody = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+447911123456',
  password: 'StrongPass1!',
};

afterEach(() => {
  sendMail.mockReset();
});

function extractResetToken() {
  const emailArgs = sendMail.mock.calls[0][0];
  const match = emailArgs.text.match(/\/reset-password\/([a-f0-9]+)/);
  return match[1];
}

describe('POST /api/auth/signup', () => {
  test('creates a user and returns a token (happy path)', async () => {
    const res = await request(app).post('/api/auth/signup').send(validSignupBody);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: validSignupBody.name,
      email: validSignupBody.email,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('rejects a duplicate email (failure case)', async () => {
    await request(app).post('/api/auth/signup').send(validSignupBody);
    const res = await request(app).post('/api/auth/signup').send(validSignupBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  test('rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validSignupBody, password: 'weak' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(validSignupBody);
  });

  test('logs in with correct credentials (happy path)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignupBody.email, password: validSignupBody.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(validSignupBody.email);
  });

  test('rejects an incorrect password without revealing whether the email exists (failure case)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignupBody.email, password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password.');
  });

  test('rejects an unknown email with the same generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password.');
  });
});

describe('GET /api/auth/me', () => {
  test('returns the user when a valid token is sent (happy path)', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send(validSignupBody);
    const { token } = signupRes.body;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validSignupBody.email);
  });

  test('returns 401 when no token is sent (failure case)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 when the token is invalid', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  const GENERIC_MESSAGE = 'If an account exists for that email, a reset link has been sent.';

  test('emails a reset link and stores a hashed token for a known local account (happy path)', async () => {
    await request(app).post('/api/auth/signup').send(validSignupBody);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: validSignupBody.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MESSAGE);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe(validSignupBody.email);

    const user = await User.findOne({ email: validSignupBody.email }).select(
      '+resetPasswordTokenHash +resetPasswordExpires',
    );
    expect(user.resetPasswordTokenHash).toEqual(expect.any(String));
    expect(user.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
  });

  test('returns the same generic message and sends no mail for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MESSAGE);
    expect(sendMail).not.toHaveBeenCalled();
  });

  test('returns the same generic message and sends no mail for a Google-only account', async () => {
    await User.create({
      name: 'Google User',
      email: 'google.user@example.com',
      provider: 'google',
      googleId: 'google-id-123',
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'google.user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MESSAGE);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/reset-password', () => {
  test('resets the password with a valid token and logs the user in (happy path)', async () => {
    await request(app).post('/api/auth/signup').send(validSignupBody);
    await request(app).post('/api/auth/forgot-password').send({ email: validSignupBody.email });
    const rawToken = extractResetToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'NewPassword1!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(validSignupBody.email);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignupBody.email, password: validSignupBody.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: validSignupBody.email, password: 'NewPassword1!' });
    expect(newLogin.status).toBe(200);
  });

  test('rejects an unknown token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(64), newPassword: 'NewPassword1!' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  test('rejects an expired token', async () => {
    await request(app).post('/api/auth/signup').send(validSignupBody);
    await request(app).post('/api/auth/forgot-password').send({ email: validSignupBody.email });
    const rawToken = extractResetToken();

    await User.findOneAndUpdate(
      { email: validSignupBody.email },
      { resetPasswordExpires: new Date(Date.now() - 1000) },
    );

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'NewPassword1!' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  test('rejects a weak new password', async () => {
    await request(app).post('/api/auth/signup').send(validSignupBody);
    await request(app).post('/api/auth/forgot-password').send({ email: validSignupBody.email });
    const rawToken = extractResetToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'weak' });

    expect(res.status).toBe(400);
  });
});
