import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import StatCard from '../components/StatCard';

describe('StatCard Component', () => {
  it('should render title and value correctly', () => {
    render(
      <StatCard
        title="Pending Cases"
        value={15}
        color="info"
        icon={Activity}
      />
    );

    expect(screen.getByText('Pending Cases')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('should display positive change indicator in green', () => {
    render(
      <StatCard
        title="Volume"
        value="50k"
        color="success"
        icon={Activity}
        change="+12%"
        changeType="positive"
      />
    );

    const changeLabel = screen.getByText(/12%/);
    expect(changeLabel).toBeInTheDocument();
    expect(changeLabel).toHaveClass('text-success');
    expect(screen.getByText('↑ +12%')).toBeInTheDocument();
  });

  it('should display negative change indicator in red', () => {
    render(
      <StatCard
        title="Blocked"
        value="200"
        color="danger"
        icon={Activity}
        change="-5"
        changeType="negative"
      />
    );

    const changeLabel = screen.getByText(/5/);
    expect(changeLabel).toBeInTheDocument();
    expect(changeLabel).toHaveClass('text-danger');
    expect(screen.getByText('↓ -5')).toBeInTheDocument();
  });
});
