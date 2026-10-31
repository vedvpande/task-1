import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

beforeEach(() => localStorage.clear());

function itemTexts() {
  const list = screen.getByRole('list', { name: 'Medicines' });
  return within(list)
    .queryAllByRole('listitem')
    .map((li) => li.textContent ?? '');
}

describe('1. heading and disclaimer', () => {
  it('shows the heading and disclaimer', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'My Medicine Reminders' })).toBeInTheDocument();
    expect(screen.getByText('This is a practice app. It does not give medical advice.')).toBeInTheDocument();
  });
});

describe('2. the list', () => {
  it('shows every medicine sorted by time', () => {
    render(<App />);
    const texts = itemTexts();
    expect(texts).toHaveLength(4);
    expect(texts[0]).toContain('Allergy syrup, 5 ml, 08:00');
    expect(texts[1]).toContain('Eye drops, 2 drops, 09:30');
    expect(texts[2]).toContain('Vitamin D, 1 tablet, 12:00');
    expect(texts[3]).toContain('Iron tablet, 1 tablet, 20:00');
  });
});

async function addMedicine(name: string, dose: string, time: string) {
  const user = userEvent.setup();
  if (name) await user.type(screen.getByLabelText('Medicine name'), name);
  if (dose) await user.type(screen.getByLabelText('Dose'), dose);
  if (time) await user.type(screen.getByLabelText('Time'), time);
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

describe('3. add a medicine', () => {
  it('adds in time order and clears the inputs', async () => {
    render(<App />);
    expect(screen.getByLabelText('Time')).toHaveAttribute('type', 'time');
    await addMedicine('Fish oil', '1 capsule', '10:15');
    const texts = itemTexts();
    expect(texts).toHaveLength(5);
    expect(texts[2]).toContain('Fish oil, 1 capsule, 10:15');
    expect(screen.getByLabelText('Medicine name')).toHaveValue('');
    expect(screen.getByLabelText('Dose')).toHaveValue('');
    expect(screen.getByLabelText('Time')).toHaveValue('');
  });
});

describe('4. check before adding', () => {
  it('needs a name', async () => {
    render(<App />);
    await addMedicine('', '1 tablet', '07:00');
    expect(screen.getByText('Please enter a medicine name')).toBeInTheDocument();
    expect(itemTexts()).toHaveLength(4);
    expect(screen.getByLabelText('Dose')).toHaveValue('1 tablet');
    expect(screen.getByLabelText('Time')).toHaveValue('07:00');
  });

  it('needs a time', async () => {
    render(<App />);
    await addMedicine('Fish oil', '1 capsule', '');
    expect(screen.getByText('Please choose a time')).toBeInTheDocument();
    expect(itemTexts()).toHaveLength(4);
    expect(screen.getByLabelText('Medicine name')).toHaveValue('Fish oil');
  });

  it('blocks the same name at the same time, ignoring case', async () => {
    render(<App />);
    await addMedicine('vitamin d', '2 tablets', '12:00');
    expect(screen.getByText('This medicine is already in the list at that time')).toBeInTheDocument();
    expect(itemTexts()).toHaveLength(4);
    expect(screen.getByLabelText('Medicine name')).toHaveValue('vitamin d');
    expect(screen.getByLabelText('Dose')).toHaveValue('2 tablets');
    expect(screen.getByLabelText('Time')).toHaveValue('12:00');
  });
});

describe('5. taken checkbox', () => {
  it('crosses out a taken medicine', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = screen.getByRole('checkbox', { name: 'Taken: Vitamin D' });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
    expect(screen.getByText('Vitamin D, 1 tablet, 12:00')).toHaveClass('line-through');
    expect(screen.getByText('Eye drops, 2 drops, 09:30')).not.toHaveClass('line-through');
  });
});

describe('6. progress', () => {
  it('counts taken medicines and shows all done', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('0 of 4 taken')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' }));
    expect(screen.getByText('1 of 4 taken')).toBeInTheDocument();
    await addMedicine('Fish oil', '1 capsule', '10:15');
    expect(screen.getByText('1 of 5 taken')).toBeInTheDocument();
    expect(screen.queryByText('All done for today!')).not.toBeInTheDocument();
    for (const name of ['Allergy syrup', 'Eye drops', 'Fish oil', 'Iron tablet']) {
      await user.click(screen.getByRole('checkbox', { name: `Taken: ${name}` }));
    }
    expect(screen.getByText('5 of 5 taken')).toBeInTheDocument();
    expect(screen.getByText('All done for today!')).toBeInTheDocument();
  });
});

describe('7. delete and undo', () => {
  it('deletes, then undo puts it back in time order', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Delete Eye drops' }));
    expect(itemTexts()).toHaveLength(3);
    expect(screen.getByText('Deleted Eye drops')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 taken')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    const texts = itemTexts();
    expect(texts).toHaveLength(4);
    expect(texts[1]).toContain('Eye drops, 2 drops, 09:30');
    expect(screen.queryByText('Deleted Eye drops')).not.toBeInTheDocument();
  });

  it('shows "No medicines yet" when the list is empty', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText('No medicines yet')).not.toBeInTheDocument();
    for (const name of ['Vitamin D', 'Allergy syrup', 'Iron tablet', 'Eye drops']) {
      await user.click(screen.getByRole('button', { name: `Delete ${name}` }));
    }
    expect(screen.getByText('No medicines yet')).toBeInTheDocument();
    expect(screen.queryByText('All done for today!')).not.toBeInTheDocument();
  });
});

describe('8. filter', () => {
  it('shows counts, filters items and sets aria-pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    const all = screen.getByRole('button', { name: 'All (4)' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'To take (4)' })).toHaveAttribute('aria-pressed', 'false');
    const taken = screen.getByRole('button', { name: 'Taken (0)' });
    expect(taken).toHaveAttribute('aria-pressed', 'false');

    await user.click(taken);
    expect(taken).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(itemTexts()).toHaveLength(0);
    expect(screen.getByText('Nothing to show here')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All (4)' }));
    await user.click(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' }));
    await user.click(screen.getByRole('button', { name: 'Taken (1)' }));
    expect(itemTexts()).toEqual([expect.stringContaining('Vitamin D')]);
    await user.click(screen.getByRole('button', { name: 'To take (3)' }));
    expect(itemTexts()).toHaveLength(3);
    expect(screen.queryByText('Nothing to show here')).not.toBeInTheDocument();
  });
});

describe('9. edit', () => {
  it('prefills, saves and re-sorts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Edit Iron tablet' }));
    const newDose = screen.getByLabelText('New dose');
    const newTime = screen.getByLabelText('New time');
    expect(newDose).toHaveValue('1 tablet');
    expect(newTime).toHaveValue('20:00');
    await user.clear(newDose);
    await user.type(newDose, '2 tablets');
    await user.clear(newTime);
    await user.type(newTime, '07:00');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const texts = itemTexts();
    expect(texts[0]).toContain('Iron tablet, 2 tablets, 07:00');
    expect(texts).toHaveLength(4);
    expect(screen.queryByLabelText('New dose')).not.toBeInTheDocument();
  });
});

describe('10. remember', () => {
  it('keeps added, edited, deleted and taken medicines after a reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await addMedicine('Fish oil', '1 capsule', '10:15');
    await user.click(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' }));
    await user.click(screen.getByRole('button', { name: 'Delete Eye drops' }));
    await user.click(screen.getByRole('button', { name: 'Edit Iron tablet' }));
    await user.clear(screen.getByLabelText('New dose'));
    await user.type(screen.getByLabelText('New dose'), '2 tablets');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    unmount();

    render(<App />);
    const texts = itemTexts();
    expect(texts).toHaveLength(4);
    expect(texts[0]).toContain('Allergy syrup, 5 ml, 08:00');
    expect(texts[1]).toContain('Fish oil, 1 capsule, 10:15');
    expect(texts[2]).toContain('Vitamin D, 1 tablet, 12:00');
    expect(texts[3]).toContain('Iron tablet, 2 tablets, 20:00');
    expect(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' })).toBeChecked();
    expect(screen.getByText('1 of 4 taken')).toBeInTheDocument();
  });

  it('starts from data.json when nothing is saved', () => {
    render(<App />);
    expect(itemTexts()).toHaveLength(4);
  });
});
