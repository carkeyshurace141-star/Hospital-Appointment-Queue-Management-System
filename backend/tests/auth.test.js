require('./setup');
const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

const validSignupBody = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555-123-4567',
  password: 'Password1',
};

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
