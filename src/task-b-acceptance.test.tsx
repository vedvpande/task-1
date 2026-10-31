// Task B (Medicine reminder list): 10 acceptance tests, one per requirement in SPEC.md.
// Put this file in the src folder, then ask Claude: "Please run npm run acceptance".
// Do NOT change this file.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import App from './App';

const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
const items = () => {
  const list = screen.queryByRole('list', { name: 'Medicines' });
  return list ? within(list).queryAllByRole('listitem') : [];
};
const texts = () => items().map((li) => norm(li.textContent));
const indexOf = (name: string) => texts().findIndex((t) => t.includes(name));
const filterButton = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label} \\(\\d+\\)$`) });

async function addMedicine(user: ReturnType<typeof userEvent.setup>, name: string, dose: string, time: string) {
  if (name) await user.type(screen.getByLabelText('Medicine name'), name);
  if (dose) await user.type(screen.getByLabelText('Dose'), dose);
  if (time) await user.type(screen.getByLabelText('Time'), time);
  await user.click(screen.getByRole('button', { name: 'Add' }));
}
async function clearForm(user: ReturnType<typeof userEvent.setup>) {
  for (const l of ['Medicine name', 'Dose', 'Time']) await user.clear(screen.getByLabelText(l));
}

describe('Task B: Medicine reminder list', () => {
  beforeEach(() => localStorage.clear());

  test('1. Heading and disclaimer', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My Medicine Reminders');
    expect(screen.getByText('This is a practice app. It does not give medical advice.')).toBeInTheDocument();
  });

  test('2. List shows name, dose and time, sorted by time', () => {
    render(<App />);
    const t = texts();
    expect(t).toHaveLength(4);
    const expected = [['Allergy syrup', '5 ml', '08:00'], ['Eye drops', '2 drops', '09:30'], ['Vitamin D', '1 tablet', '12:00'], ['Iron tablet', '1 tablet', '20:00']];
    expected.forEach((parts, i) => parts.forEach((p) => expect(t[i]).toContain(p)));
  });

  test('3. "Add" puts a new medicine in the right place and clears all inputs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addMedicine(user, 'Inhaler', '2 puffs', '10:15');
    expect(items()).toHaveLength(5);
    expect(indexOf('Inhaler')).toBe(2);
    expect(texts()[2]).toContain('2 puffs');
    expect(texts()[2]).toContain('10:15');
    expect(screen.getByLabelText('Medicine name')).toHaveValue('');
    expect(screen.getByLabelText('Dose')).toHaveValue('');
    expect(screen.getByLabelText('Time')).toHaveValue('');
  });

  test('4. Checks before adding: name, time and duplicates', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addMedicine(user, '', '1 tablet', '07:00');
    expect(items()).toHaveLength(4);
    expect(screen.getByText('Please enter a medicine name')).toBeInTheDocument();
    expect(screen.getByLabelText('Dose')).toHaveValue('1 tablet');
    await clearForm(user);
    await addMedicine(user, 'Zinc', '1 tablet', '');
    expect(items()).toHaveLength(4);
    expect(screen.getByText('Please choose a time')).toBeInTheDocument();
    expect(screen.getByLabelText('Medicine name')).toHaveValue('Zinc');
    await clearForm(user);
    await addMedicine(user, 'vitamin d', '1 tablet', '12:00');
    expect(items()).toHaveLength(4);
    expect(screen.getByText('This medicine is already in the list at that time')).toBeInTheDocument();
    await clearForm(user);
    await addMedicine(user, 'Vitamin D', '1 tablet', '21:00'); // same name, different time is fine
    expect(items()).toHaveLength(5);
  });

  test('5. "Taken" checkbox marks a medicine and crosses it out', async () => {
    const user = userEvent.setup();
    render(<App />);
    const box = screen.getByRole('checkbox', { name: 'Taken: Vitamin D' });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' })).toBeChecked();
    const li = items()[indexOf('Vitamin D')];
    const crossed = [li, ...Array.from(li.querySelectorAll('*'))].some((el) =>
      ['S', 'DEL', 'STRIKE'].includes(el.tagName) ||
      /line-through/.test(el.getAttribute('class') ?? '') ||
      /line-through/.test((el as HTMLElement).style?.textDecoration ?? '') ||
      /line-through/.test((el as HTMLElement).style?.textDecorationLine ?? ''));
    expect(crossed).toBe(true);
  });

  test('6. Progress "X of Y taken" updates, and "All done for today!"', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/0 of 4 taken/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' }));
    expect(screen.getByText(/1 of 4 taken/)).toBeInTheDocument();
    await addMedicine(user, 'Inhaler', '2 puffs', '10:15');
    expect(screen.getByText(/1 of 5 taken/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete Vitamin D' }));
    expect(screen.getByText(/0 of 4 taken/)).toBeInTheDocument();
    expect(screen.queryByText(/All done for today!/)).not.toBeInTheDocument();
    for (const n of ['Allergy syrup', 'Eye drops', 'Inhaler', 'Iron tablet']) await user.click(screen.getByRole('checkbox', { name: `Taken: ${n}` }));
    expect(screen.getByText(/4 of 4 taken/)).toBeInTheDocument();
    expect(screen.getByText(/All done for today!/)).toBeInTheDocument();
  });

  test('7. Delete, Undo, and "No medicines yet"', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Delete Eye drops' }));
    expect(items()).toHaveLength(3);
    expect(indexOf('Eye drops')).toBe(-1);
    expect(screen.getByText(/Deleted Eye drops/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(items()).toHaveLength(4);
    expect(indexOf('Eye drops')).toBe(1);
    for (const name of ['Vitamin D', 'Allergy syrup', 'Iron tablet', 'Eye drops']) {
      await user.click(screen.getByRole('button', { name: `Delete ${name}` }));
    }
    expect(items()).toHaveLength(0);
    expect(screen.getByText('No medicines yet')).toBeInTheDocument();
  });

  test('8. Filter buttons with counts and aria-pressed', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(filterButton('All')).toHaveAccessibleName('All (4)');
    expect(filterButton('To take')).toHaveAccessibleName('To take (4)');
    expect(filterButton('Taken')).toHaveAccessibleName('Taken (0)');
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true');
    expect(filterButton('Taken')).toHaveAttribute('aria-pressed', 'false');
    await user.click(filterButton('Taken'));
    expect(texts()).toHaveLength(0);
    expect(screen.getByText('Nothing to show here')).toBeInTheDocument();
    expect(screen.queryByText('No medicines yet')).not.toBeInTheDocument();
    await user.click(filterButton('All'));
    await user.click(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' }));
    expect(filterButton('Taken')).toHaveAccessibleName('Taken (1)');
    expect(filterButton('To take')).toHaveAccessibleName('To take (3)');
    await user.click(filterButton('Taken'));
    expect(filterButton('Taken')).toHaveAttribute('aria-pressed', 'true');
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'false');
    expect(texts()).toHaveLength(1);
    expect(texts()[0]).toContain('Vitamin D');
    await user.click(filterButton('To take'));
    expect(texts()).toHaveLength(3);
    expect(indexOf('Vitamin D')).toBe(-1);
  });

  test('9. Edit changes dose and time and keeps the list sorted', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Edit Iron tablet' }));
    const dose = screen.getByLabelText('New dose');
    const time = screen.getByLabelText('New time');
    expect(dose).toHaveValue('1 tablet');
    expect(time).toHaveValue('20:00');
    await user.clear(dose);
    await user.type(dose, '2 tablets');
    await user.clear(time);
    await user.type(time, '07:30');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(items()).toHaveLength(4);
    expect(indexOf('Iron tablet')).toBe(0);
    expect(texts()[0]).toContain('2 tablets');
    expect(texts()[0]).toContain('07:30');
    expect(screen.queryByLabelText('New dose')).not.toBeInTheDocument();
  });

  test('10. The list is remembered after a reload', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await addMedicine(user, 'Inhaler', '2 puffs', '10:15');
    await user.click(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' }));
    await user.click(screen.getByRole('button', { name: 'Delete Iron tablet' }));
    first.unmount();
    render(<App />); // like reloading the page
    expect(items()).toHaveLength(4);
    expect(indexOf('Inhaler')).toBe(2);
    expect(indexOf('Iron tablet')).toBe(-1);
    expect(screen.getByRole('checkbox', { name: 'Taken: Vitamin D' })).toBeChecked();
  });
});
