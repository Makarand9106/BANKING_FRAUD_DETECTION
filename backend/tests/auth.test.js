import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';

// Mock rate limiting to prevent attempts blocks
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/fraud_detection_test';

describe('Auth REST Endpoints Suite', () => {
  let adminToken = '';
  let userEmail = 'test_user_auth@bank.com';
  let userPassword = 'Password123!';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
  }, 60000);

  afterAll(async () => {
    await User.deleteMany({ email: userEmail });
    await mongoose.connection.close();
  }, 60000);

  beforeEach(async () => {
    await User.deleteMany({ email: userEmail });
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new analyst user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: userEmail,
          password: userPassword,
          role: 'analyst'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('registered successfully');

      // Verify DB entry
      const dbUser = await User.findOne({ email: userEmail });
      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe('analyst');
    });

    it('should fail registration if email already exists', async () => {
      // Pre-create user
      await User.create({
        email: userEmail,
        passwordHash: userPassword,
        role: 'analyst'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: userEmail,
          password: userPassword,
          role: 'analyst'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject invalid password configurations', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: userEmail,
          password: 'short', // missing digit, uppercase, and length
          role: 'analyst'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Setup user for login
      await User.create({
        email: userEmail,
        passwordHash: userPassword,
        role: 'admin'
      });
    });

    it('should login and return access token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: userPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('admin');
      
      // Save token for subsequent tests
      adminToken = res.body.accessToken;
    });

    it('should reject incorrect credentials passwords', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject if operator user email not found', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@bank.com',
          password: userPassword
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should fail refresh-token if cookie is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send();

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('token is required');
    });

    it('should return 401 for invalid/expired tokens', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', ['refreshToken=invalid_token_value_here'])
        .send();

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear cookies and logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let activeToken = '';

    beforeEach(async () => {
      const u = await User.create({
        email: userEmail,
        passwordHash: userPassword,
        role: 'analyst'
      });
      activeToken = u.generateAccessToken();
    });

    it('should successfully update operator passwords', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${activeToken}`)
        .send({
          currentPassword: userPassword,
          newPassword: 'NewPassword999!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password changed successfully');
    });

    it('should block if current credentials are wrong', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${activeToken}`)
        .send({
          currentPassword: 'IncorrectPassword!',
          newPassword: 'NewPassword999!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should generate OTP on existing profiles', async () => {
      await User.create({
        email: userEmail,
        passwordHash: userPassword,
        role: 'analyst'
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: userEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for missing emails', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown_operator@bank.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reject invalid or expired OTP sequences', async () => {
      await User.create({
        email: userEmail,
        passwordHash: userPassword,
        role: 'analyst'
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: userEmail,
          otp: '111222',
          newPassword: 'NewPassword999!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
