let screenshots = [];

init();

function init() {
  wireEvents();
  loadScreenshots();
}

function wireEvents() {
  document
    .getElementById("capture")
    .addEventListener("click", captureScreenshot);
  document.getElementById("open-editor").addEventListener("click", openEditor);
  document.getElementById("generate").addEventListener("click", exportPdf);
  document.getElementById("clear").addEventListener("click", clearAll);
}

function loadScreenshots() {
  chrome.storage.local.get(["screenshots"], (result) => {
    screenshots = Array.isArray(result.screenshots) ? result.screenshots : [];
    updateCount();
    updateHint();
  });
}

async function captureScreenshot() {
  const btn = document.getElementById("capture");
  btn.disabled = true;
  btn.textContent = "Capturing...";

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "jpeg",
      quality: 92,
    });

    screenshots.push(dataUrl);
    persist();
    updateCount();
    updateHint();
    showToast("Screenshot captured");
  } catch (error) {
    showToast("Capture failed: " + error.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Capture";
  }
}

function openEditor() {
  chrome.tabs.create({ url: chrome.runtime.getURL("editor.html") });
}

function exportPdf() {
  if (screenshots.length === 0) {
    showToast("No pages to export", true);
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
      showToast("PDF exported");
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

function clearAll() {
  if (screenshots.length === 0) {
    showToast("No pages to clear", true);
    return;
  }
  if (!confirm("Delete all pages?")) {
    return;
  }

  screenshots = [];
  chrome.storage.local.set({ screenshots: [] }, () => {
    updateCount();
    updateHint();
    showToast("All pages cleared");
  });
}

function persist() {
  chrome.storage.local.set({ screenshots });
}

function updateCount() {
  const count = screenshots.length;
  document.getElementById("count").textContent =
    count === 1 ? "1 page" : count + " pages";
}

function updateHint() {
  const hint = document.getElementById("hint");
  const n = screenshots.length;
  let msg;
  if (n === 0) {
    msg =
      "Switch to your lecture tab, then click Capture to save the current slide.";
  } else if (n === 1) {
    msg =
      "1 slide saved! Keep capturing more, then Export PDF when you're done.";
  } else if (n < 6) {
    msg =
      n +
      " slides saved. Capture more or use Manage to reorder before exporting.";
  } else {
    msg =
      n +
      " slides ready! Hit Export PDF to download your complete lecture notes.";
  }
  hint.textContent = msg;
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = isError ? "toast toast-error" : "toast";
  setTimeout(() => {
    toast.className = "toast hidden";
  }, 2200);
}
