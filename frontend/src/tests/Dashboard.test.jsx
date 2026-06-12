import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EventEmitter from 'events';
import { AuthContext } from '../context/AuthContext';
import { Dashboard } from '../pages/Dashboard';
import api from '../services/api';

// 1. Mock useSocket hook
class MockSocket extends EventEmitter {
  on = vi.fn((event, cb) => super.on(event, cb));
  off = vi.fn((event, cb) => super.off(event, cb));
}
const mockSocket = new MockSocket();

vi.mock('../hooks/useSocket', () => ({
  useSocket: () => ({ socket: mockSocket })
}));

// 2. Mock API client service
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn()
  }
}));

// 3. Mock Recharts to avoid rendering bounds warnings inside JSDOM environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div data-testid="mock-bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />
}));

const mockUserContext = {
  user: { email: 'admin@bank.com', role: 'admin' },
  isAuthenticated: true,
  loading: false
};

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockUserContext}>
        <Dashboard />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Dashboard Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading skeleton while fetching data', async () => {
    // Hang API call to keep in loading state
    api.get.mockReturnValue(new Promise(() => {}));

    renderDashboard();
    
    // Check loading placeholders (rendered as pulse animations)
    const statPlaceholders = document.querySelectorAll('.animate-pulse');
    expect(statPlaceholders.length).toBeGreaterThan(0);
  });

  it('should render 4 stat cards when data resolves', async () => {
    api.get.mockImplementation((url, config) => {
      if (url === '/api/accounts/top-suspicious') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { account: { _id: 'acc1', accountNumber: 'ACC-001', riskScore: 80, balance: 150000, lastActiveAt: new Date().toISOString() } }
            ]
          }
        });
      }
      if (url.includes('/api/alerts')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
            pagination: { total: 5 }
          }
        });
      }
      if (url.includes('/api/transactions') && config?.params?.status === 'blocked') {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
            pagination: { total: 7 }
          }
        });
      }
      // Transactions
      return Promise.resolve({
        data: {
          success: true,
          data: [],
          pagination: { total: 42 }
        }
      });
    });

    renderDashboard();

    // Wait for loader to clear
    await waitFor(() => {
      expect(screen.getByText('Total Transactions (Today)')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Fraud Alerts')).toBeInTheDocument();
    expect(screen.getByText('Blocked Transactions')).toBeInTheDocument();
    expect(screen.getByText('Average Risk Score')).toBeInTheDocument();

    // Verify stats value values mapping
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should dynamically update transaction counts on socket event triggers', async () => {
    api.get.mockImplementation((url, config) => {
      if (url.includes('/api/transactions') && config?.params?.status !== 'blocked') {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
            pagination: { total: 10 }
          }
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          data: [],
          pagination: { total: 2 }
        }
      });
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Total Transactions (Today)')).toBeInTheDocument();
    });

    // Check initial transaction count is 10
    expect(screen.getByText('10')).toBeInTheDocument();

    // Trigger transactionCreated WS event
    await act(async () => {
      mockSocket.emit('transactionCreated', {
        transaction: {
          _id: 'txNew',
          fromAccount: { accountNumber: 'ACC-010' },
          toAccount: { accountNumber: 'ACC-020' },
          amount: 5000,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      });
    });

    // Count should increment to 11
    expect(screen.getByText('11')).toBeInTheDocument();
  });
});
