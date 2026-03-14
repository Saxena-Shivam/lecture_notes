let screenshots = [];
let dragStartIndex = -1;
let autoExportRequested = false;

document.getElementById("reload").addEventListener("click", load);
document.getElementById("export-pdf").addEventListener("click", exportPdf);
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "EXPORT_PDF_NOW") {
    exportPdf();
  }
});

const params = new URLSearchParams(window.location.search);
autoExportRequested = params.get("autoExport") === "1";

load();

function load() {
  chrome.storage.local.get(["screenshots"], (result) => {
    screenshots = Array.isArray(result.screenshots) ? result.screenshots : [];
    render();

    if (autoExportRequested) {
      autoExportRequested = false;
      exportPdf();
      history.replaceState({}, "", "editor.html");
    }
  });
}

function save() {
  chrome.storage.local.set({ screenshots });
}

function render() {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const count = document.getElementById("count");

  grid.innerHTML = "";
  count.textContent =
    screenshots.length === 1 ? "1 page" : screenshots.length + " pages";

  if (screenshots.length === 0) {
    empty.classList.remove("hidden");
    grid.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.classList.remove("hidden");

  screenshots.forEach((src, index) => {
    const card = document.createElement("article");
    card.className = "card";
    card.draggable = true;
    card.dataset.index = String(index);

    card.addEventListener("dragstart", onDragStart);
    card.addEventListener("dragover", onDragOver);
    card.addEventListener("drop", onDrop);
    card.addEventListener("dragend", onDragEnd);

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = src;
    img.alt = "Screenshot page " + (index + 1);

    const meta = document.createElement("div");
    meta.className = "meta";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = "Page " + (index + 1);

    const controls = document.createElement("div");
    controls.className = "controls";

    const left = document.createElement("button");
    left.className = "mini";
    left.textContent = "←";
    left.title = "Move left";
    left.onclick = () => shift(index, -1);

    const right = document.createElement("button");
    right.className = "mini";
    right.textContent = "→";
    right.title = "Move right";
    right.onclick = () => shift(index, 1);

    const remove = document.createElement("button");
    remove.className = "mini danger";
    remove.textContent = "Delete";
    remove.title = "Remove page";
    remove.onclick = () => del(index);

    controls.appendChild(left);
    controls.appendChild(right);
    controls.appendChild(remove);

    meta.appendChild(label);
    meta.appendChild(controls);

    card.appendChild(img);
    card.appendChild(meta);

    grid.appendChild(card);
  });
}

function shift(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= screenshots.length) {
    return;
  }

  const temp = screenshots[index];
  screenshots[index] = screenshots[next];
  screenshots[next] = temp;
  save();
  render();
}

function del(index) {
  screenshots.splice(index, 1);
  save();
  render();
}

function onDragStart(event) {
  dragStartIndex = Number(event.currentTarget.dataset.index);
  event.currentTarget.classList.add("dragging");
}

function onDragOver(event) {
  event.preventDefault();
}

function onDrop(event) {
  event.preventDefault();
  const targetIndex = Number(event.currentTarget.dataset.index);

  if (targetIndex === dragStartIndex || dragStartIndex < 0) {
    return;
  }

  const [moved] = screenshots.splice(dragStartIndex, 1);
  screenshots.splice(targetIndex, 0, moved);
  dragStartIndex = -1;
  save();
  render();
}

function onDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
}

function exportPdf() {
  if (screenshots.length === 0) {
    alert("No pages to export.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const first = new Image();

  first.onload = () => {
    const pdf = new jsPDF({
      orientation: first.width > first.height ? "landscape" : "portrait",
      unit: "px",
      format: [first.width, first.height],
    });

    addPageToPdf(pdf, 0, () => {
      pdf.save("lecture-notes.pdf");
    });
  };

  first.src = screenshots[0];
}

function addPageToPdf(pdf, index, done) {
  if (index >= screenshots.length) {
    done();
    return;
  }

  const img = new Image();
  img.onload = () => {
    if (index !== 0) {
      pdf.addPage(
        [img.width, img.height],
        img.width > img.height ? "landscape" : "portrait",
      );
    }
    pdf.addImage(img, "JPEG", 0, 0, img.width, img.height);
    addPageToPdf(pdf, index + 1, done);
  };
  img.src = screenshots[index];
}
