import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttemptList } from '@/components/game/AttemptList';
import { Attempt, Association } from '@/types';

const createAttempt = (overrides?: Partial<Attempt>): Attempt => ({
  userInput: 'test input',
  similarity: 90,
  threshold: 95,
  expectedAnswer: 'expected answer',
  timestamp: 1000,
  associationId: 'assoc1',
  ...overrides,
});

const createAssociation = (overrides?: Partial<Association>): Association => ({
  id: 'assoc1',
  term: 'Term 1',
  definition: 'Def 1',
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  ...overrides,
});

describe('AttemptList', () => {
  it('returns null when there are no attempts', () => {
    const { container } = render(
      <AttemptList
        attempts={[]}
        revealedAssociations={[]}
        associations={[createAssociation()]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders attempts', () => {
    const attempts = [createAttempt({ timestamp: 1000, userInput: 'first attempt' }), createAttempt({ timestamp: 2000, userInput: 'second attempt' })];

    render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={[]}
        associations={[createAssociation()]}
      />,
    );

    expect(screen.getByText('"first attempt"')).toBeInTheDocument();
    expect(screen.getByText('"second attempt"')).toBeInTheDocument();
    expect(screen.getAllByText('90%').length).toBe(2);
  });

  it('calls onSelectAttempt when clicking a low-similarity revealed attempt', () => {
    const onSelectAttempt = vi.fn();
    const attempts = [createAttempt({ similarity: 90, timestamp: 1000 })];

    render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={['assoc1']}
        associations={[createAssociation()]}
        onSelectAttempt={onSelectAttempt}
      />,
    );

    fireEvent.click(screen.getByText('"test input"'));
    expect(onSelectAttempt).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelectAttempt when clicking a low-similarity unrevealed attempt', () => {
    const onSelectAttempt = vi.fn();
    const attempts = [createAttempt({ similarity: 90, timestamp: 1000 })];

    render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={[]}
        associations={[createAssociation()]}
        onSelectAttempt={onSelectAttempt}
      />,
    );

    fireEvent.click(screen.getByText('"test input"'));
    expect(onSelectAttempt).not.toHaveBeenCalled();
  });

  it('does not call onSelectAttempt when clicking a high-similarity attempt', () => {
    const onSelectAttempt = vi.fn();
    const attempts = [createAttempt({ similarity: 100, timestamp: 1000 })];

    render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={['assoc1']}
        associations={[createAssociation()]}
        onSelectAttempt={onSelectAttempt}
      />,
    );

    fireEvent.click(screen.getByText('"test input"'));
    expect(onSelectAttempt).not.toHaveBeenCalled();
  });

  it('does not call onSelectAttempt when onSelectAttempt is undefined', () => {
    const attempts = [createAttempt({ similarity: 90, timestamp: 1000 })];

    render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={['assoc1']}
        associations={[createAssociation()]}
      />,
    );

    fireEvent.click(screen.getByText('"test input"'));
    // Should not throw
  });

  it('shows selected state for selected attempt', () => {
    const attempts = [createAttempt({ similarity: 90, timestamp: 1000 })];

    const { container } = render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={['assoc1']}
        associations={[createAssociation()]}
        selectedAttemptId={1000}
      />,
    );

    const attemptDiv = container.querySelector('.ring-2');
    expect(attemptDiv).toBeTruthy();
  });

  it('reveals expected answer when association is revealed', () => {
    const attempts = [createAttempt({ associationId: 'assoc1' })];

    render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={['assoc1']}
        associations={[createAssociation()]}
      />,
    );

    expect(screen.getByText('expected answer')).toBeInTheDocument();
  });

  it('masks expected answer when association is not revealed', () => {
    const attempts = [createAttempt({ associationId: 'assoc1', expectedAnswer: 'expected answer' })];

    render(
      <AttemptList
        attempts={attempts}
        revealedAssociations={[]}
        associations={[createAssociation()]}
      />,
    );

    expect(screen.queryByText('expected answer')).not.toBeInTheDocument();
  });
});
