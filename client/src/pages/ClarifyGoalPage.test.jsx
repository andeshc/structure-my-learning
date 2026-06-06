import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import ClarifyGoalPage from './ClarifyGoalPage';

vi.mock('../api/guides', () => ({
  fetchClarifyingQuestions: vi.fn(),
  createGuide: vi.fn(),
}));

import { fetchClarifyingQuestions, createGuide } from '../api/guides';

const MOCK_QUESTIONS = [
  {
    id: 'primary-goal',
    question: 'What is your primary goal?',
    rationale: 'Helps shape the curriculum focus.',
    allowMultiple: false,
    options: [
      { id: 'automate', label: 'Automate tasks' },
      { id: 'web', label: 'Build web apps' },
      { id: 'data', label: 'Data analysis' },
    ],
  },
  {
    id: 'prior-exp',
    question: 'Which of these have you used before?',
    rationale: null,
    allowMultiple: true,
    options: [
      { id: 'excel', label: 'Excel / spreadsheets' },
      { id: 'sql', label: 'SQL' },
      { id: 'none', label: 'None of these' },
    ],
  },
];

const VALID_STATE = { prompt: 'Learn Python', learningLevel: 'adult_beginner', coverage: 'balanced' };

function renderPage(state = VALID_STATE) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/guides/new/clarify', state }]}>
      <Routes>
        <Route path="/guides/new/clarify" element={<ClarifyGoalPage />} />
        <Route path="/guides/new" element={<div data-testid="new-guide-page" />} />
        <Route path="/guides/:guideId" element={<div data-testid="guide-detail-page" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ClarifyGoalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects to /guides/new when no router state', async () => {
    fetchClarifyingQuestions.mockResolvedValue({ skip: false, questions: MOCK_QUESTIONS });
    await act(async () => {
      renderPage(null);
    });
    expect(screen.getByTestId('new-guide-page')).toBeInTheDocument();
  });

  it('shows skeleton cards while fetching', async () => {
    fetchClarifyingQuestions.mockReturnValue(new Promise(() => {})); // never resolves
    await act(async () => {
      renderPage();
    });
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('renders question cards and echoes the prompt', async () => {
    fetchClarifyingQuestions.mockResolvedValue({ skip: false, questions: MOCK_QUESTIONS });
    await act(async () => {
      renderPage();
    });
    expect(await screen.findByText('What is your primary goal?')).toBeInTheDocument();
    expect(screen.getByText('Which of these have you used before?')).toBeInTheDocument();
    expect(screen.getByText('Learn Python')).toBeInTheDocument();
  });

  it('toggles single-select chip', async () => {
    fetchClarifyingQuestions.mockResolvedValue({ skip: false, questions: MOCK_QUESTIONS });
    await act(async () => {
      renderPage();
    });
    await screen.findByText('Automate tasks');

    const chip = screen.getByText('Automate tasks').closest('button');
    await act(async () => { fireEvent.click(chip); });
    expect(chip.className).toMatch(/bg-teal-700/);

    await act(async () => { fireEvent.click(chip); });
    expect(chip.className).not.toMatch(/bg-teal-700/);
  });

  it('toggles multi-select chips independently', async () => {
    fetchClarifyingQuestions.mockResolvedValue({ skip: false, questions: MOCK_QUESTIONS });
    await act(async () => {
      renderPage();
    });
    await screen.findByText('Excel / spreadsheets');

    const excel = screen.getByText('Excel / spreadsheets').closest('button');
    const sql = screen.getByText('SQL').closest('button');

    await act(async () => {
      fireEvent.click(excel);
      fireEvent.click(sql);
    });
    expect(excel.className).toMatch(/bg-teal-700/);
    expect(sql.className).toMatch(/bg-teal-700/);

    await act(async () => { fireEvent.click(excel); });
    expect(excel.className).not.toMatch(/bg-teal-700/);
    expect(sql.className).toMatch(/bg-teal-700/);
  });

  it('submits with selected answers when Generate is clicked', async () => {
    fetchClarifyingQuestions.mockResolvedValue({ skip: false, questions: MOCK_QUESTIONS });
    createGuide.mockResolvedValue({ guideId: 'guide_abc' });
    await act(async () => {
      renderPage();
    });
    await screen.findByText('Automate tasks');

    await act(async () => {
      fireEvent.click(screen.getByText('Automate tasks').closest('button'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Generate guide outline →'));
    });

    await waitFor(() => {
      expect(createGuide).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Learn Python',
          clarifications: [
            { question: 'What is your primary goal?', answers: ['automate'] },
          ],
        })
      );
    });
  });

  it('submits with empty clarifications when Skip is clicked', async () => {
    fetchClarifyingQuestions.mockResolvedValue({ skip: false, questions: MOCK_QUESTIONS });
    createGuide.mockResolvedValue({ guideId: 'guide_abc' });
    await act(async () => {
      renderPage();
    });
    await screen.findByText('Skip & generate');

    await act(async () => {
      fireEvent.click(screen.getByText('Skip & generate'));
    });

    await waitFor(() => {
      expect(createGuide).toHaveBeenCalledWith(
        expect.objectContaining({ clarifications: [] })
      );
    });
  });

  it('auto-submits with empty clarifications on skip:true response', async () => {
    fetchClarifyingQuestions.mockResolvedValue({ skip: true, reason: 'Already specific.', questions: [] });
    createGuide.mockResolvedValue({ guideId: 'guide_xyz' });

    renderPage();

    expect(await screen.findByText(/Your prompt is clear/)).toBeInTheDocument();

    await waitFor(
      () => expect(createGuide).toHaveBeenCalledWith(expect.objectContaining({ clarifications: [] })),
      { timeout: 2000 }
    );
  });

  it('shows error state and Generate without questions CTA on fetch failure', async () => {
    fetchClarifyingQuestions.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText("Couldn't load questions")).toBeInTheDocument();
    expect(screen.getByText('Generate without questions')).toBeInTheDocument();
  });
});
