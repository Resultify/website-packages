/* The calculations page, while it is rebuilt to edit hours.csv: one line says so. */
const root = document.querySelector("#calc");
if (!(root instanceof HTMLElement)) throw new Error("Missing #calc");
const line = document.createElement("p");
line.className = "c-rebuilt";
line.textContent = "The calculations page is being rebuilt.";
root.replaceChildren(line);
