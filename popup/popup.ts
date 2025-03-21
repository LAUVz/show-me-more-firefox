// Show Me More - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Mark that user has interacted with extension (opening popup counts as interaction)
  await browser.runtime.sendMessage({ action: 'markUserInteracted' });

  // Get UI elements
  const recordingToggle = document.getElementById('recording-toggle') as HTMLInputElement;
  const recordingStatus = document.getElementById('recording-status') as HTMLSpanElement;
  const countBadge = document.getElementById('count-badge') as HTMLSpanElement;
  const prevButton = document.getElementById('prev-button') as HTMLButtonElement;
  const nextButton = document.getElementById('next-button') as HTMLButtonElement;
  const showAllButton = document.getElementById('show-all-button') as HTMLButtonElement;
  const showAllBeforeButton = document.getElementById('show-all-before-button') as HTMLButtonElement;
  const showAllAfterButton = document.getElementById('show-all-after-button') as HTMLButtonElement;
  const viewRecordedButton = document.getElementById('view-recorded-button') as HTMLButtonElement;
  const clearRecordedButton = document.getElementById('clear-recorded-button') as HTMLButtonElement;
  const aboutButton = document.getElementById('about-button') as HTMLButtonElement;

  // Get current recording state and recorded images
  const isRecording = await browser.runtime.sendMessage({ action: 'getIsRecording' });
  const recordedImages = await browser.runtime.sendMessage({ action: 'getRecordedImages' });

  // Update UI based on current state
  recordingToggle.checked = isRecording;
  recordingStatus.textContent = isRecording ? 'On' : 'Off';
  countBadge.textContent = recordedImages.length.toString();

  // Toggle recording state
  recordingToggle.addEventListener('change', async () => {
    const newState = await browser.runtime.sendMessage({ action: 'toggleRecording' });
    recordingStatus.textContent = newState ? 'On' : 'Off';
  });

  // Navigate to previous image
  prevButton.addEventListener('click', async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0].id) {
      console.log("Previous button clicked - tab ID:", tabs[0].id);
      await browser.runtime.sendMessage({
        action: 'navigatePrev',
        tabId: tabs[0].id
      });
      window.close();
    }
  });

  // Navigate to next image
  nextButton.addEventListener('click', async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0].id) {
      console.log("Next button clicked - tab ID:", tabs[0].id);
      await browser.runtime.sendMessage({
        action: 'navigateNext',
        tabId: tabs[0].id
      });
      window.close();
    }
  });

  // Show all images in sequence
  showAllButton.addEventListener('click', async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0].id) {
      console.log("Show All button clicked - tab ID:", tabs[0].id);
      await browser.runtime.sendMessage({
        action: 'showAll',
        tabId: tabs[0].id,
        direction: 'both'
      });
      window.close();
    }
  });

  // Show all images before current
  showAllBeforeButton.addEventListener('click', async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0].id) {
      console.log("Show All Before button clicked - tab ID:", tabs[0].id);
      await browser.runtime.sendMessage({
        action: 'showAll',
        tabId: tabs[0].id,
        direction: 'prev'
      });
      window.close();
    }
  });

  // Show all images after current
  showAllAfterButton.addEventListener('click', async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0].id) {
      console.log("Show All After button clicked - tab ID:", tabs[0].id);
      await browser.runtime.sendMessage({
        action: 'showAll',
        tabId: tabs[0].id,
        direction: 'next'
      });
      window.close();
    }
  });

  // View all recorded images
  viewRecordedButton.addEventListener('click', async () => {
    await browser.tabs.create({
      url: '/gallery/gallery.html?mode=recorded'
    });
    window.close();
  });

  // Clear all recorded images
  clearRecordedButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all recorded images?')) {
      await browser.runtime.sendMessage({ action: 'resetRecorded' });
      countBadge.textContent = '0';
    }
  });

  // Show about page
  aboutButton.addEventListener('click', async () => {
    await browser.tabs.create({
      url: '/about/about.html'
    });
    window.close();
  });

  // Enable/disable buttons based on current page
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      // Log for debugging
      console.log("Current tab URL:", tabs[0].url);

      // Only enable navigation buttons if the current page has a URL with numbers
      const url = tabs[0].url;
      const parsedURI = await browser.runtime.sendMessage({
        action: 'parseURI',
        uri: url
      });

      console.log("Parsed URI:", parsedURI);

      const canNavigate = parsedURI && parsedURI.num !== false;

      console.log("Can navigate:", canNavigate);

      prevButton.disabled = !canNavigate;
      nextButton.disabled = !canNavigate;
      showAllButton.disabled = !canNavigate;
      showAllBeforeButton.disabled = !canNavigate;
      showAllAfterButton.disabled = !canNavigate;

      // Add visual indication if buttons are disabled
      if (!canNavigate) {
        prevButton.title += " (Unavailable for this page)";
        nextButton.title += " (Unavailable for this page)";
        showAllButton.title += " (Unavailable for this page)";
        showAllBeforeButton.title += " (Unavailable for this page)";
        showAllAfterButton.title += " (Unavailable for this page)";

        prevButton.classList.add('disabled');
        nextButton.classList.add('disabled');
        showAllButton.classList.add('disabled');
        showAllBeforeButton.classList.add('disabled');
        showAllAfterButton.classList.add('disabled');
      } else {
        console.log("Navigation enabled for:", tabs[0].id);
      }
    }
  } catch (error) {
    console.error("Error checking navigation availability:", error);
  }

  // Disable view recorded button if no images are recorded
  viewRecordedButton.disabled = recordedImages.length === 0;
  clearRecordedButton.disabled = recordedImages.length === 0;
});
