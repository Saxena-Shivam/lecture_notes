// In-memory list; kept alive while popup is open.
// Persisted to chrome.storage.local so screenshots survive popup close/reopen.
let screenshots = [];

// ─── Load persisted screenshots on popup open ────────────────────────────────
chrome.storage.local.get(["screenshots"], (result) => {
  if (result.screenshots && result.screenshots.length > 0) {
    screenshots = result.screenshots;
    renderThumbnails();
    updateCount();
    updateHint();
  }
});

// ─── Capture Screenshot ───────────────────────────────────────────────────────
document.getElementById("capture").addEventListener("click", async () => {
  const btn = document.getElementById("capture");
  btn.disabled = true;
  btn.textContent = "Capturing…";

  try {
    // captureVisibleTab takes a real screenshot of the active tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "jpeg",
      quality: 90,
    });

    screenshots.push(dataUrl);
    persist();
    renderThumbnails();
    updateCount();
    updateHint();
    showToast("✅ Screenshot #" + screenshots.length + " captured!");
  } catch (err) {
    showToast("❌ Failed: " + err.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = "&#128247; Capture Screenshot";
  }
});

// ─── Export PDF ───────────────────────────────────────────────────────────────
document.getElementById("generate").addEventListener("click", () => {
  if (screenshots.length === 0) {
    showToast("No screenshots yet. Capture some first!", true);
    return;
  }

  const { jsPDF } = window.jspdf;

  // Determine orientation from first image
  const firstImg = new Image();
  firstImg.onload = () => {
    const landscape = firstImg.width > firstImg.height;
    const orientation = landscape ? "landscape" : "portrait";

    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [firstImg.width, firstImg.height],
    });

    const addPage = (index) => {
      if (index >= screenshots.length) {
        pdf.save("lecture-notes.pdf");
        showToast("📄 PDF saved as lecture-notes.pdf");
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
        addPage(index + 1);
      };
      img.src = screenshots[index];
    };

    addPage(0);
  };
  firstImg.src = screenshots[0];
});

// ─── Clear All ────────────────────────────────────────────────────────────────
document.getElementById("clear").addEventListener("click", () => {
  if (screenshots.length === 0) return;
  if (!confirm("Delete all " + screenshots.length + " screenshot(s)?")) return;
  screenshots = [];
  chrome.storage.local.remove("screenshots");
  renderThumbnails();
  updateCount();
  updateHint();
  showToast("All screenshots cleared.");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function persist() {
  chrome.storage.local.set({ screenshots });
}

function updateCount() {
  const n = screenshots.length;
  document.getElementById("count").textContent =
    n === 0 ? "0 screenshots" : n + " screenshot" + (n !== 1 ? "s" : "");
}

function updateHint() {
  const hint = document.getElementById("hint");
  if (screenshots.length === 0) {
    hint.textContent =
      "Open your lecture, then click Capture each time you want to save a slide.";
  } else {
    hint.textContent = "Keep capturing slides. When done, click Export as PDF.";
  }
}

function renderThumbnails() {
  const container = document.getElementById("thumbnails");
  container.innerHTML = "";

  if (screenshots.length === 0) {
    container.innerHTML = '<p class="empty-msg">No screenshots yet.</p>';
    return;
  }

  screenshots.forEach((src, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "thumb-wrapper";

    const img = document.createElement("img");
    img.src = src;
    img.className = "thumb";
    img.title = "Screenshot #" + (index + 1);

    const label = document.createElement("span");
    label.className = "thumb-label";
    label.textContent = "#" + (index + 1);

    const del = document.createElement("button");
    del.className = "thumb-del";
    del.textContent = "\u00D7";
    del.title = "Remove this screenshot";
    del.onclick = () => {
      screenshots.splice(index, 1);
      persist();
      renderThumbnails();
      updateCount();
      updateHint();
    };

    wrapper.appendChild(img);
    wrapper.appendChild(label);
    wrapper.appendChild(del);
    container.appendChild(wrapper);
  });
}

function showToast(msg, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast" + (isError ? " error" : "");
  setTimeout(() => {
    toast.className = "toast hidden";
  }, 2500);
}
