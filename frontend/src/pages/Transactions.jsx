import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import TransactionTable from '../components/TransactionTable';
import { 
  Filter, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const Transactions = () => {
  const { socket } = useSocket();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  const fetchTransactions = async (resetNewCount = true) => {
    setLoading(true);
    try {
      const activeFilters = {};
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== '') activeFilters[key] = val;
      });

      const response = await api.get('/api/transactions', { params: activeFilters });
      setTransactions(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      
      if (resetNewCount) {
        setNewCount(0);
      }
    } catch (err) {
      console.error('Failed to query transactions list:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filters.page, filters.limit, filters.status, filters.sortBy]);

  // Handle socket ingestion in real time
  useEffect(() => {
    if (socket) {
      const handleTxCreated = (data) => {
        // Prepend to array if on page 1
        if (filters.page === 1) {
          setTransactions(prev => {
            // Prevent duplicate insertion
            if (prev.some(t => t._id === data.transaction._id)) return prev;
            return [data.transaction, ...prev].slice(0, filters.limit);
          });
        }
        // Increment new transactions count indicator
        setNewCount(prev => prev + 1);
      };

      socket.on('transactionCreated', handleTxCreated);
      return () => {
        socket.off('transactionCreated', handleTxCreated);
      };
    }
  }, [socket, filters.page, filters.limit]);

  // Handle filter submissions
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'timestamp',
      sortOrder: 'desc',
      page: 1,
      limit: filters.limit
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  // Render ellipsis pagination numbers (max 5)
  const renderPageNumbers = () => {
    const totalPages = pagination.pages;
    const current = filters.page;
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (current >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', totalPages);
      }
    }

    return pages.map((p, idx) => {
      if (p === '...') {
        return (
          <span key={`el-${idx}`} className="px-2 text-muted text-xs select-none">
            ...
          </span>
        );
      }
      return (
        <button
          key={p}
          onClick={() => setFilters(prev => ({ ...prev, page: p }))}
          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
            current === p
              ? 'bg-accent text-surface shadow-sm'
              : 'hover:bg-bg border border-accent/5 text-muted'
          }`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-accent/5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Ingestion Console</h1>
          <p className="text-sm text-muted mt-1">
            Browse transaction ledger sheets, apply multi-attribute queries, and audit threat vectors.
          </p>
        </div>
      </div>

      {/* Real-time incoming transactions banner */}
      {newCount > 0 && (
        <div className="p-3 bg-info-bg text-info border border-info/20 rounded-xl flex items-center justify-between animate-fade-in text-xs font-bold">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-info animate-bounce" />
            <span>{newCount} new transaction{newCount > 1 ? 's have' : ' has'} been ingested in the background.</span>
          </div>
          <button
            onClick={() => fetchTransactions(true)}
            className="px-3 py-1 bg-info text-surface hover:bg-info/90 rounded-lg text-[10px] uppercase font-bold tracking-wide transition-colors flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Ledger</span>
          </button>
        </div>
      )}

      {/* Horizontal Filter Bar */}
      <div className="bg-surface border border-accent/5 rounded-xl shadow-sm p-4">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Search */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Search Keyword</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="ID, Account, Merchant..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-8 pr-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Status dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Decision Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="flagged">Flagged</option>
                <option value="blocked">Blocked</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Start date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              />
            </div>

            {/* End date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              />
            </div>

            {/* Min amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Min Amount (₹)</label>
              <input
                type="number"
                placeholder="Min ₹..."
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value, page: 1 }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              />
            </div>

            {/* Max amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Max Amount (₹)</label>
              <input
                type="number"
                placeholder="Max ₹..."
                value={filters.maxAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value, page: 1 }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              />
            </div>

            {/* Sort by */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Sort Metric</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value, page: 1 }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="timestamp">Timestamp</option>
                <option value="amount">Amount</option>
                <option value="riskScore">Risk Score</option>
              </select>
            </div>

            {/* Sort direction */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value, page: 1 }))}
                className="w-full px-3 py-1.5 bg-bg text-text-primary border border-accent/10 rounded-lg focus:outline-none focus:border-accent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-accent/5">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[10px] font-bold text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-accent hover:bg-accent/90 text-surface font-semibold rounded-lg shadow-sm flex items-center space-x-1.5"
            >
              <Filter className="w-3.5 h-3.5 text-surface" />
              <span>Query Records</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results details header */}
      <div className="flex justify-between items-center text-xs text-muted">
        <div>
          Showing <span className="font-bold text-text-primary">{transactions.length}</span> of{' '}
          <span className="font-bold text-text-primary">{pagination.total}</span> transaction logs
        </div>
      </div>

      {/* Main ledger grid table */}
      <div className="bg-surface border border-accent/5 rounded-xl shadow-sm overflow-hidden p-3">
        <TransactionTable transactions={transactions} isLoading={loading} />
      </div>

      {/* Ellipsis Pagination Bar */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-accent/5 pt-4 text-xs select-none">
          <div className="flex items-center space-x-2">
            <span className="text-muted">Rows per page:</span>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }))}
              className="px-2 py-1 bg-bg text-text-primary border border-accent/10 rounded focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page === 1}
              className="p-1 border border-accent/10 rounded-lg hover:bg-bg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {renderPageNumbers()}
            </div>

            <button
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page === pagination.pages}
              className="p-1 border border-accent/10 rounded-lg hover:bg-bg disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
