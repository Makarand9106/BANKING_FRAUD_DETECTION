import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/error.middleware.js';
import authRouter from './routes/auth.routes.js';
import transactionRouter from './routes/transaction.routes.js';
import accountRouter from './routes/account.routes.js';
import alertRouter from './routes/alert.routes.js';
import graphRouter from './routes/graph.routes.js';

const app = express();

// Safety & Utilities
app.use(helmet());
app.use(
  cors({
    // Only allow your exact Vite frontend domain
    origin: 'http://localhost:3000', 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Custom Morgan logger integration
app.use(morgan('dev'));

// Security Rate Limiter: Max 100 requests per 15 minutes for Auth API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please retry after 15 minutes.',
  },
});

app.use('/api/auth', authLimiter);

// API Routes Mounting
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/graph', graphRouter);
// Centralized error boundary mounted last
app.use(errorHandler);


export default app;
