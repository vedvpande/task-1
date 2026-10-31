import { useEffect, useState, type SubmitEvent } from 'react';
import data from './data.json';

export type Medicine = { id: number; name: string; dose: string; time: string; taken: boolean };

type Filter = 'all' | 'todo' | 'taken';

export function sortByTime(list: Medicine[]): Medicine[] {
  return [...list].sort((a, b) => a.time.localeCompare(b.time));
}

export const STORAGE_KEY = 'medicine-reminders';

function initialMedicines(): Medicine[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) return sortByTime(parsed as Medicine[]);
    }
  } catch {
    // Storage blocked or bad JSON: fall back to the starting list.
  }
  return sortByTime(data.medicines.map((m) => ({ ...m, taken: false })));
}

export default function App() {
  const [medicines, setMedicines] = useState<Medicine[]>(initialMedicines);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [lastDeleted, setLastDeleted] = useState<Medicine | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDose, setEditDose] = useState('');
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
    } catch {
      // Storage blocked: the app still works for this visit.
    }
  }, [medicines]);

  function handleAdd(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a medicine name');
      return;
    }
    if (!time) {
      setError('Please choose a time');
      return;
    }
    if (medicines.some((m) => m.name.toLowerCase() === trimmed.toLowerCase() && m.time === time)) {
      setError('This medicine is already in the list at that time');
      return;
    }
    setError('');
    const id = Math.max(0, ...medicines.map((m) => m.id)) + 1;
    setMedicines(sortByTime([...medicines, { id, name: name.trim(), dose: dose.trim(), time, taken: false }]));
    setName('');
    setDose('');
    setTime('');
  }

  function toggleTaken(id: number) {
    setMedicines(medicines.map((m) => (m.id === id ? { ...m, taken: !m.taken } : m)));
  }

  function deleteMedicine(id: number) {
    const target = medicines.find((m) => m.id === id);
    if (!target) return;
    setMedicines(medicines.filter((m) => m.id !== id));
    setLastDeleted(target);
  }

  function undoDelete() {
    if (!lastDeleted) return;
    setMedicines(sortByTime([...medicines, lastDeleted]));
    setLastDeleted(null);
  }

  function startEdit(m: Medicine) {
    setEditingId(m.id);
    setEditDose(m.dose);
    setEditTime(m.time);
  }

  function saveEdit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editTime) return;
    setMedicines(
      sortByTime(medicines.map((m) => (m.id === editingId ? { ...m, dose: editDose.trim(), time: editTime } : m))),
    );
    setEditingId(null);
  }

  const takenCount = medicines.filter((m) => m.taken).length;
  const allDone = medicines.length > 0 && takenCount === medicines.length;
  const visibleMedicines = medicines.filter((m) =>
    filter === 'all' ? true : filter === 'taken' ? m.taken : !m.taken,
  );
  const filterButtons: { value: Filter; label: string }[] = [
    { value: 'all', label: `All (${medicines.length})` },
    { value: 'todo', label: `To take (${medicines.length - takenCount})` },
    { value: 'taken', label: `Taken (${takenCount})` },
  ];

  return (
    <main className="mx-auto max-w-xl p-6 text-gray-900">
      <h1 className="text-3xl font-bold">My Medicine Reminders</h1>
      <p className="mt-2 text-sm">This is a practice app. It does not give medical advice.</p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          Medicine name
          <input className="rounded border border-gray-400 px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Dose
          <input className="rounded border border-gray-400 px-2 py-1" value={dose} onChange={(e) => setDose(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          Time
          <input
            type="time"
            className="rounded border border-gray-400 px-2 py-1"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <button type="submit" className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800">
          Add
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6" aria-live="polite">
        <p className="font-medium">{`${takenCount} of ${medicines.length} taken`}</p>
        {allDone && <p className="font-semibold text-green-800">All done for today!</p>}
      </div>

      <div className="mt-4 flex gap-2" role="group" aria-label="Filter">
        {filterButtons.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            className={`rounded border px-3 py-1 text-sm ${
              filter === f.value ? 'border-blue-700 bg-blue-700 text-white' : 'border-gray-400 bg-white text-gray-900'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul aria-label="Medicines" className="mt-4 space-y-2">
        {visibleMedicines.map((m) => (
          <li key={m.id} className="rounded border border-gray-300 p-2">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`Taken: ${m.name}`}
                  className="h-4 w-4"
                  checked={m.taken}
                  onChange={() => toggleTaken(m.id)}
                />
                <span className={m.taken ? 'text-gray-600 line-through' : ''}>{`${m.name}, ${m.dose}, ${m.time}`}</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${m.name}`}
                  className="rounded border border-gray-700 px-2 py-0.5 text-sm text-gray-900 hover:bg-gray-100"
                  onClick={() => startEdit(m)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${m.name}`}
                  className="rounded border border-red-700 px-2 py-0.5 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => deleteMedicine(m.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {editingId === m.id && (
              <form onSubmit={saveEdit} className="mt-2 flex flex-wrap items-end gap-2">
                <label className="flex flex-col text-sm">
                  New dose
                  <input
                    className="rounded border border-gray-400 px-2 py-1"
                    value={editDose}
                    onChange={(e) => setEditDose(e.target.value)}
                  />
                </label>
                <label className="flex flex-col text-sm">
                  New time
                  <input
                    type="time"
                    className="rounded border border-gray-400 px-2 py-1"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                  />
                </label>
                <button type="submit" className="rounded bg-blue-700 px-3 py-1 text-white hover:bg-blue-800">
                  Save
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {medicines.length === 0 && <p className="mt-4 text-gray-700">No medicines yet</p>}
      {medicines.length > 0 && visibleMedicines.length === 0 && (
        <p className="mt-4 text-gray-700">Nothing to show here</p>
      )}

      {lastDeleted && (
        <div className="mt-4 flex items-center gap-2" aria-live="polite">
          <p>{`Deleted ${lastDeleted.name}`}</p>
          <button type="button" className="rounded bg-gray-800 px-2 py-0.5 text-sm text-white" onClick={undoDelete}>
            Undo
          </button>
        </div>
      )}
    </main>
  );
}
