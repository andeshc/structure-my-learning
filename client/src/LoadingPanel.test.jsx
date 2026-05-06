import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingPanel from './components/LoadingPanel';

describe('LoadingPanel', () => {
  it('renders status text', () => {
    render(<LoadingPanel title="Generating" detail="Saving the lesson first." />);

    expect(screen.getByText('Generating')).toBeInTheDocument();
    expect(screen.getByText('Saving the lesson first.')).toBeInTheDocument();
  });
});
