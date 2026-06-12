import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskBadge from '../components/RiskBadge';

describe('RiskBadge Component', () => {
  it('should render CRITICAL variant with correct color class', () => {
    render(<RiskBadge severity="CRITICAL" />);
    const badge = screen.getByText('CRITICAL');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-danger-bg');
    expect(badge).toHaveClass('text-danger');
  });

  it('should render HIGH variant with correct color class', () => {
    render(<RiskBadge score={75} />); // 75 falls in HIGH range
    const badge = screen.getByText(/HIGH/);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-danger-bg');
    expect(badge).toHaveClass('text-danger');
  });

  it('should render MEDIUM variant with correct color class', () => {
    render(<RiskBadge severity="MEDIUM" />);
    const badge = screen.getByText('MEDIUM');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-warning-bg');
    expect(badge).toHaveClass('text-warning');
  });

  it('should render LOW variant with correct color class', () => {
    render(<RiskBadge score={20} />); // 20 falls in LOW range
    const badge = screen.getByText(/LOW/);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-warning-bg');
    expect(badge).toHaveClass('text-warning');
  });

  it('should render NONE variant with correct color class', () => {
    render(<RiskBadge severity="NONE" />);
    const badge = screen.getByText('NONE');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-success-bg');
    expect(badge).toHaveClass('text-success');
  });

  describe('size props mapping', () => {
    it('should map sm size to sm class', () => {
      render(<RiskBadge severity="NONE" size="sm" />);
      const badge = screen.getByText('NONE');
      expect(badge).toHaveClass('text-[9px]');
      expect(badge).toHaveClass('px-1.5');
    });

    it('should map md size to standard class', () => {
      render(<RiskBadge severity="NONE" size="md" />);
      const badge = screen.getByText('NONE');
      expect(badge).toHaveClass('text-[10px]');
      expect(badge).toHaveClass('px-2');
    });

    it('should map lg size to lg class', () => {
      render(<RiskBadge severity="NONE" size="lg" />);
      const badge = screen.getByText('NONE');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('px-3');
    });
  });
});
