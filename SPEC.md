# Challenge: My Medicine Reminders

Build a one-page reminder list for **fictional** medicines. The starting list is in `src/data.json`.
Build it in `src/App.tsx` (you may add more components). `App` must stay the **default export**.

Use the **exact words** shown in quotes below: the checker looks for them.

## Requirements

1. **Heading and disclaimer.** The page has one main heading (`h1`): "My Medicine Reminders". It shows this exact sentence: "This is a practice app. It does not give medical advice."
2. **The list.** Show a list labelled "Medicines" (`aria-label="Medicines"`) with one item per medicine. Each item shows the name, dose and time (for example "Allergy syrup, 5 ml, 08:00"). The list is always sorted by time, earliest first.
3. **Add a medicine.** A form with three inputs labelled "Medicine name", "Dose" and "Time" (a time input) and a button "Add". Clicking "Add" puts the new medicine in the list, in the right place by time, and clears all three inputs.
4. **Check before adding.** When you click "Add", nothing is added and the inputs keep their values if:
   - the name is empty: show "Please enter a medicine name"
   - the time is empty: show "Please choose a time"
   - a medicine with the same name (ignoring upper or lower case) is already in the list at the same time: show "This medicine is already in the list at that time".
5. **Taken checkbox.** Each item has a checkbox labelled "Taken: " followed by the medicine name (for example "Taken: Vitamin D"). A taken medicine is shown crossed out.
6. **Progress.** The page shows how many are taken, for example "1 of 4 taken". It updates when checkboxes change and when medicines are added or deleted. When every medicine is taken (and the list is not empty), it also shows "All done for today!".
7. **Delete and undo.** Each item has a button labelled "Delete " followed by the medicine name (for example "Delete Eye drops") that removes it. After a delete, the page shows "Deleted Eye drops" and a button "Undo" that puts the medicine back (in the right place by time). When there are no medicines at all, the page shows "No medicines yet".
8. **Filter.** Three buttons show the count in brackets: "All (4)", "To take (4)" and "Taken (0)". They change which items are shown. The selected button has `aria-pressed="true"` and the others `aria-pressed="false"`. "All" is selected at the start. If the chosen filter shows nothing but the list is not empty, show "Nothing to show here".
9. **Edit.** Each item has a button labelled "Edit " followed by the medicine name (for example "Edit Iron tablet"). It shows two inputs labelled "New dose" and "New time", filled with the current values, and a button "Save". Saving updates the medicine and keeps the list sorted by time.
10. **Remember.** The list (including added, edited, deleted and taken medicines) is kept when the page is reloaded. Use the browser's `localStorage`. If nothing is saved yet, start with the list from `data.json`.

## Tips

- Ask Claude for a plan first, then let it build one requirement at a time.
- Run `npm run dev` (ask Claude) and open the link to look at your page.
- Make it look good with Tailwind CSS classes, but finish the requirements first.
