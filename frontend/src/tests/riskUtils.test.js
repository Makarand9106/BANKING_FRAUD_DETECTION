import { describe, it, expect } from 'vitest';
import { formatAmount, getSeverityLabel, getDecisionLabel } from '../utils/riskUtils';

describe('Risk Utilities Helper Functions', () => {
  describe('formatAmount (INR formatting)', () => {
    it('should format 9800 to ₹9,800', () => {
      // Stripping potential non-breaking spaces before matching
      const result = formatAmount(9800).replace(/\u00a0/g, ' ');
      // Handle potential variation in currency formats (e.g. ₹9,800 vs ₹ 9,800)
      expect(result).toMatch(/₹\s*9,800/);
    });

    it('should format 150000 to ₹1,50,000', () => {
      const result = formatAmount(150000).replace(/\u00a0/g, ' ');
      expect(result).toMatch(/₹\s*1,50,000/);
    });

    it('should handle zero gracefully', () => {
      const result = formatAmount(0).replace(/\u00a0/g, ' ');
      expect(result).toMatch(/₹\s*0/);
    });
  });

  describe('getSeverityLabel (5 severity ranges)', () => {
    it('should return CRITICAL for scores >= 85', () => {
      expect(getSeverityLabel(85)).toBe('CRITICAL');
      expect(getSeverityLabel(98)).toBe('CRITICAL');
    });

    it('should return HIGH for scores between 70 and 84', () => {
      expect(getSeverityLabel(70)).toBe('HIGH');
      expect(getSeverityLabel(80)).toBe('HIGH');
    });

    it('should return MEDIUM for scores between 35 and 69', () => {
      expect(getSeverityLabel(35)).toBe('MEDIUM');
      expect(getSeverityLabel(60)).toBe('MEDIUM');
    });

    it('should return LOW for scores between 15 and 34', () => {
      expect(getSeverityLabel(15)).toBe('LOW');
      expect(getSeverityLabel(30)).toBe('LOW');
    });

    it('should return NONE for scores < 15', () => {
      expect(getSeverityLabel(0)).toBe('NONE');
      expect(getSeverityLabel(14)).toBe('NONE');
    });
  });

  describe('getDecisionLabel (APPROVE, REVIEW, BLOCK)', () => {
    it('should return BLOCK for scores >= 70', () => {
      expect(getDecisionLabel(70)).toBe('BLOCK');
      expect(getDecisionLabel(90)).toBe('BLOCK');
    });

    it('should return REVIEW for scores between 40 and 69', () => {
      expect(getDecisionLabel(40)).toBe('REVIEW');
      expect(getDecisionLabel(65)).toBe('REVIEW');
    });

    it('should return APPROVE for scores < 40', () => {
      expect(getDecisionLabel(0)).toBe('APPROVE');
      expect(getDecisionLabel(39)).toBe('APPROVE');
    });
  });
});
