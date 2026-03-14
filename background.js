// Background service worker — Manifest V3

const MENU_CAPTURE = "lecture_capture";
const MENU_EXPORT = "lecture_export_pdf";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Initialize empty screenshot list on fresh install
    chrome.storage.local.set({ screenshots: [] });
    console.log("Lecture Screenshot to PDF installed.");
  }

  setupContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus();
});

chrome.commands.onCommand.addListener(async (command) => {
  try {
    if (command === "capture_screenshot") {
      const windowId = await getActiveWindowId();
      if (typeof windowId === "number") {
        await captureScreenshotFromTab(windowId);
      } else {
        await flashBadge("TAB", "#b91c1c");
      }
    } else if (command === "export_pdf") {
      await exportStoredScreenshotsToPdf();
    }
  } catch (error) {
    console.error("Shortcut action failed:", error);
    await flashBadge("ERR", "#dc2626");
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === MENU_CAPTURE) {
      const windowId =
        tab && typeof tab.windowId === "number"
          ? tab.windowId
          : await getActiveWindowId();
      if (typeof windowId === "number") {
        await captureScreenshotFromTab(windowId);
      } else {
        await flashBadge("TAB", "#b91c1c");
      }
    } else if (info.menuItemId === MENU_EXPORT) {
      await exportStoredScreenshotsToPdf();
    }
  } catch (error) {
    console.error("Context menu action failed:", error);
    await flashBadge("ERR", "#dc2626");
  }
});

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_CAPTURE,
      title: "Capture screenshot",
      contexts: ["action"],
    });

    chrome.contextMenus.create({
      id: MENU_EXPORT,
      title: "Export PDF",
      contexts: ["action"],
    });
  });
}

async function getActiveWindowId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && typeof tab.windowId === "number" ? tab.windowId : null;
}

async function captureScreenshotFromTab(windowId) {
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: "jpeg",
    quality: 92,
  });

  const result = await chrome.storage.local.get(["screenshots"]);
  const screenshots = Array.isArray(result.screenshots)
    ? result.screenshots
    : [];
  screenshots.push(dataUrl);
  await chrome.storage.local.set({ screenshots });

  await flashBadge(String(Math.min(screenshots.length, 999)), "#0f766e");
}

async function exportStoredScreenshotsToPdf() {
  const result = await chrome.storage.local.get(["screenshots"]);
  const screenshots = Array.isArray(result.screenshots)
    ? result.screenshots
    : [];

  if (screenshots.length === 0) {
    await flashBadge("0", "#b91c1c");
    return;
  }

  await openEditorAndExport();

  await flashBadge("PDF", "#0f4c81");
}

async function openEditorAndExport() {
  const editorBase = chrome.runtime.getURL("editor.html");
  const matches = await chrome.tabs.query({ url: `${editorBase}*` });
  const exportUrl = `${editorBase}?autoExport=1&t=${Date.now()}`;

  if (matches.length > 0) {
    const tab = matches[0];
    await chrome.tabs.update(tab.id, { url: exportUrl, active: true });
    if (typeof tab.windowId === "number") {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({ url: exportUrl, active: true });
}

async function flashBadge(text, color) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, 1200);
}
