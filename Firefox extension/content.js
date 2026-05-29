// content.js
(function() {
  if (window.__nanogptBrowserAssistantContentLoaded) return;
  window.__nanogptBrowserAssistantContentLoaded = true;
  window.__nanogptAskAiContentLoaded = true;

  if (window.top !== window.self) return;

  const {
    floatingIconPositionStyle,
    isExtensionContextInvalidated,
    nearestFloatingIconCorner,
    normalizeFloatingIconCorner,
    screenshotCropRect,
    visibleRectFromElementRect,
  } = NanoGPTContentUtils;

  // Check if we're on a blacklisted site
  browser.storage.local.get('blacklistedDomains').then(result => {
    const blacklistedDomains = result.blacklistedDomains || ['nano-gpt.com'];
    
    if (blacklistedDomains.some(domain => window.location.hostname.includes(domain))) {
      return; // Exit if we're on a blacklisted site
    }

    let activePageActionCleanup = null;
    let cleanupFloatingIcon = null;
    let floatingIconCorner = 'bottom-right';

    function cancelPageAction() {
      if (!activePageActionCleanup) return false;
      activePageActionCleanup();
      return true;
    }

    function sendRuntimeMessage(message) {
      try {
        return browser.runtime.sendMessage(message).catch((error) => {
          if (isExtensionContextInvalidated(error) && cleanupFloatingIcon) cleanupFloatingIcon();
          return { ok: false, error: error && error.message ? error.message : String(error) };
        });
      } catch (error) {
        if (isExtensionContextInvalidated(error)) {
          if (cleanupFloatingIcon) cleanupFloatingIcon();
          return Promise.resolve({ ok: false, error: error && error.message ? error.message : String(error) });
        }
        throw error;
      }
    }

    function showFloatingIconNotice(message) {
      const existingNotice = document.getElementById('nanogpt-floating-icon-notice');
      if (existingNotice) existingNotice.remove();

      const notice = document.createElement('div');
      notice.id = 'nanogpt-floating-icon-notice';
      notice.textContent = message;
      notice.style.cssText = [
        'position: fixed',
        'right: 18px',
        'top: 50%',
        'transform: translateY(-50%)',
        'z-index: 2147483647',
        'max-width: min(300px, calc(100vw - 36px))',
        'padding: 10px 12px',
        'border: 1px solid rgba(74, 168, 255, .65)',
        'border-radius: 8px',
        'background: #111827',
        'color: #f9fafb',
        'font: 13px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        'box-shadow: 0 10px 30px rgba(0,0,0,.3)',
      ].join(';');
      document.body.appendChild(notice);
      setTimeout(() => notice.remove(), 4200);
    }

    let floatingIconEnabled = true; // New setting for floating icon

    // Load the saved preferences
    browser.storage.local.get(['floatingIconEnabled', 'floatingIconCorner'], function(result) {
      floatingIconEnabled = result.floatingIconEnabled !== undefined ? result.floatingIconEnabled : true;
      floatingIconCorner = normalizeFloatingIconCorner(result.floatingIconCorner);
      if (floatingIconEnabled) {
        initFloatingIcon();
      }
    });

    // Listen for the keyboard shortcut message
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "nanogpt_start_circle_search") {
        startCircleSearch();
        return Promise.resolve({ ok: true });
      } else if (request.action === "nanogpt_start_selection_pick") {
        startSelectionPick();
        return Promise.resolve({ ok: true });
      } else if (request.action === "nanogpt_get_selected_text") {
        const text = getSelectedPageText();
        return Promise.resolve(text ? { ok: true, text } : { ok: false, error: 'No selected text found on this page.' });
      } else if (request.action === "nanogpt_get_page_text") {
        const text = getPagePlainText();
        return Promise.resolve(text ? { ok: true, text } : { ok: false, error: 'No readable page text found.' });
      } else if (request.action === "nanogpt_start_image_pick") {
        startImagePick();
        return Promise.resolve({ ok: true });
      } else if (request.action === "nanogpt_cancel_page_action") {
        return Promise.resolve({ ok: cancelPageAction() });
      }
      return undefined;
    });

    function cropScreenshot(dataUrl, selection) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const points = Array.isArray(selection.points) ? selection.points : [];
          const bounds = selection.bounds || selection;
          const crop = screenshotCropRect(
            bounds,
            { width: image.naturalWidth, height: image.naturalHeight },
            { width: window.innerWidth, height: window.innerHeight },
          );
          const maxDimension = 1600;
          const outputScale = Math.min(1, maxDimension / Math.max(crop.width, crop.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(crop.width * outputScale));
          canvas.height = Math.max(1, Math.round(crop.height * outputScale));
          const ctx = canvas.getContext('2d');

          if (points.length >= 3) {
            ctx.save();
            ctx.beginPath();
            points.forEach((point, index) => {
              const px = ((point.x * (image.naturalWidth / window.innerWidth)) - crop.x) * outputScale;
              const py = ((point.y * (image.naturalHeight / window.innerHeight)) - crop.y) * outputScale;
              if (index === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.clip();
          }

          ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
          if (points.length >= 3) ctx.restore();
          resolve(points.length >= 3 ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.88));
        };
        image.onerror = () => reject(new Error('Could not load captured screenshot.'));
        image.src = dataUrl;
      });
    }

    async function captureElementImage(element) {
      const { left, top, width, height } = visibleRectFromElementRect(element.getBoundingClientRect(), window.innerWidth, window.innerHeight);

      if (width < 2 || height < 2) {
        throw new Error('This image is not visible enough to capture.');
      }

      const captureResponse = await browser.runtime.sendMessage({ action: 'nanogpt_capture_visible_tab' });
      if (!captureResponse || !captureResponse.ok) {
        throw new Error(captureResponse && captureResponse.error ? captureResponse.error : 'Could not capture this tab.');
      }

      return cropScreenshot(captureResponse.dataUrl, { left, top, width, height });
    }

    function startCircleSearch() {
      if (document.getElementById('nanogpt-circle-search-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'nanogpt-circle-search-overlay';
      overlay.innerHTML = `
        <div id="nanogpt-circle-search-tip">Lasso an area to ask NanoGPT. Press Esc to cancel.</div>
        <svg id="nanogpt-circle-search-canvas" aria-hidden="true">
          <path id="nanogpt-circle-search-path"></path>
        </svg>
      `;

      const style = document.createElement('style');
      style.id = 'nanogpt-circle-search-style';
      style.textContent = `
        #nanogpt-circle-search-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          cursor: crosshair;
          background: rgba(12, 18, 28, 0.22);
          user-select: none;
        }
        #nanogpt-circle-search-tip {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          padding: 9px 12px;
          border-radius: 8px;
          background: #111827;
          color: #fff;
          font: 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,.25);
          pointer-events: none;
        }
        #nanogpt-circle-search-canvas {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
        }
        #nanogpt-circle-search-path {
          fill: rgba(77, 171, 247, 0.18);
          stroke: #4dabf7;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,.35));
        }
      `;

      document.documentElement.appendChild(style);
      document.body.appendChild(overlay);

      const path = overlay.querySelector('#nanogpt-circle-search-path');
      const points = [];
      let dragging = false;
      let cleanedUp = false;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        overlay.remove();
        style.remove();
        document.removeEventListener('keydown', onKeyDown, true);
        if (activePageActionCleanup === cleanup) activePageActionCleanup = null;
        browser.runtime.sendMessage({ action: 'nanogpt_page_action_state', mode: 'circle', active: false });
      };

      const updatePath = () => {
        if (points.length === 0) {
          path.setAttribute('d', '');
          return;
        }
        const [first, ...rest] = points;
        path.setAttribute('d', `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')}${points.length > 2 ? ' Z' : ''}`);
      };

      const addPoint = (clientX, clientY) => {
        const last = points[points.length - 1];
        if (last && Math.hypot(clientX - last.x, clientY - last.y) < 4) return;
        points.push({ x: clientX, y: clientY });
        updatePath();
      };

      const getBounds = () => {
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const right = Math.max(...xs);
        const bottom = Math.max(...ys);
        return { left, top, width: right - left, height: bottom - top };
      };

      const onKeyDown = (event) => {
        if (event.key === 'Escape') cleanup();
      };

      document.addEventListener('keydown', onKeyDown, true);
      activePageActionCleanup = cleanup;
      browser.runtime.sendMessage({ action: 'nanogpt_page_action_state', mode: 'circle', active: true });

      overlay.addEventListener('mousedown', (event) => {
        event.preventDefault();
        dragging = true;
        points.length = 0;
        addPoint(event.clientX, event.clientY);
      });

      overlay.addEventListener('mousemove', (event) => {
        if (!dragging) return;
        event.preventDefault();
        addPoint(event.clientX, event.clientY);
      });

      overlay.addEventListener('mouseup', async (event) => {
        if (!dragging) return;
        dragging = false;
        event.preventDefault();
        addPoint(event.clientX, event.clientY);

        const bounds = getBounds();
        if (points.length < 3 || bounds.width < 8 || bounds.height < 8) {
          cleanup();
          return;
        }

        const lassoSelection = { points: [...points], bounds };
        cleanup();

        try {
          const captureResponse = await browser.runtime.sendMessage({ action: 'nanogpt_capture_visible_tab' });
          if (!captureResponse || !captureResponse.ok) {
            alert(captureResponse && captureResponse.error ? captureResponse.error : 'Could not capture this tab.');
            return;
          }

          const croppedImage = await cropScreenshot(captureResponse.dataUrl, lassoSelection);
          await browser.runtime.sendMessage({
            action: 'nanogpt_circle_search_image',
            text: 'What is in this lassoed region?',
            imageUrl: croppedImage,
            attachmentLabel: 'Area',
          });
        } catch (error) {
          alert(error && error.message ? error.message : String(error));
        }
      });
    }

    function getSelectedPageText() {
      const selected = window.getSelection && window.getSelection().toString().trim();
      if (selected) return selected;
      const active = document.activeElement;
      if (active && typeof active.value === 'string') {
        const start = active.selectionStart;
        const end = active.selectionEnd;
        if (typeof start === 'number' && typeof end === 'number' && end > start) {
          return active.value.slice(start, end).trim();
        }
      }
      return '';
    }

    function getElementPlainText(element) {
      if (!element || element.closest?.('#nanogpt-selection-pick-tip')) return '';
      if (element === document.body || element === document.documentElement) return '';
      if (typeof element.value === 'string') return element.value.trim().slice(0, 120000);
      const labelled = element.getAttribute?.('aria-label') || element.getAttribute?.('alt') || '';
      if (labelled) return labelled.replace(/\s+/g, ' ').trim().slice(0, 120000);

      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const parts = [];
      let length = 0;
      while (length < 120000) {
        const node = walker.nextNode();
        if (!node) break;
        const value = node.nodeValue || '';
        if (!value.trim()) continue;
        const remaining = 120000 - length;
        const chunk = value.slice(0, remaining);
        parts.push(chunk);
        length += chunk.length;
      }
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    }

    function getPagePlainText() {
      const root = document.querySelector('main') || document.body || document.documentElement;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest('script, style, noscript, svg, canvas, iframe, [aria-hidden="true"], #nanogpt-selection-pick-tip, #nanogpt-circle-search-overlay')) {
            return NodeFilter.FILTER_REJECT;
          }
          const value = node.nodeValue || '';
          if (!value.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const parts = [];
      let length = 0;
      while (length < 120000) {
        const node = walker.nextNode();
        if (!node) break;
        const value = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (!value) continue;
        const remaining = 120000 - length;
        const chunk = value.slice(0, remaining);
        parts.push(chunk);
        length += chunk.length;
      }
      return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    function startSelectionPick() {
      if (document.getElementById('nanogpt-selection-pick-tip')) return;

      const tip = document.createElement('div');
      tip.id = 'nanogpt-selection-pick-tip';
      tip.textContent = 'Select text or click an element. Press Esc to cancel.';
      const style = document.createElement('style');
      style.id = 'nanogpt-selection-pick-style';
      style.textContent = `
        #nanogpt-selection-pick-tip {
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2147483647;
          padding: 9px 12px;
          border-radius: 8px;
          background: #111827;
          color: #f9fafb;
          font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,.28);
          pointer-events: none;
        }
        .nanogpt-selection-pick-hover {
          outline: 2px solid #4aa8ff !important;
          outline-offset: 2px !important;
          cursor: text !important;
        }
      `;

      let hovered = null;
      let mouseDown = false;
      let cleanedUp = false;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        if (hovered) hovered.classList.remove('nanogpt-selection-pick-hover');
        tip.remove();
        style.remove();
        document.removeEventListener('mouseover', onMouseOver, true);
        document.removeEventListener('mouseout', onMouseOut, true);
        document.removeEventListener('mousedown', onMouseDown, true);
        document.removeEventListener('mouseup', onMouseUp, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
        if (activePageActionCleanup === cleanup) activePageActionCleanup = null;
        browser.runtime.sendMessage({ action: 'nanogpt_page_action_state', mode: 'selection', active: false });
      };

      const sendText = (text) => {
        const plainText = String(text || '').trim().slice(0, 120000);
        if (!plainText) return false;
        cleanup();
        browser.runtime.sendMessage({ action: 'nanogpt_selection_text', text: plainText });
        return true;
      };

      const onMouseOver = (event) => {
        const target = event.target && event.target.nodeType === Node.ELEMENT_NODE ? event.target : null;
        if (!target || target === hovered || target.closest?.('#nanogpt-selection-pick-tip')) return;
        if (hovered) hovered.classList.remove('nanogpt-selection-pick-hover');
        hovered = target;
        hovered.classList.add('nanogpt-selection-pick-hover');
      };

      const onMouseOut = (event) => {
        const target = event.target && event.target.nodeType === Node.ELEMENT_NODE ? event.target : null;
        if (target && target === hovered) {
          hovered.classList.remove('nanogpt-selection-pick-hover');
          hovered = null;
        }
      };

      const onMouseDown = () => {
        mouseDown = true;
      };

      const onMouseUp = (event) => {
        if (!mouseDown) return;
        mouseDown = false;
        event.stopPropagation();
        setTimeout(() => {
          const selected = getSelectedPageText();
          if (selected) {
            sendText(selected);
          }
        }, 0);
      };

      const onClick = (event) => {
        try {
          if (getSelectedPageText()) return;
          const text = getElementPlainText(event.target);
          if (!text) return;
          event.preventDefault();
          event.stopPropagation();
          sendText(text);
        } catch {
          cleanup();
        }
      };

      const onKeyDown = (event) => {
        if (event.key === 'Escape') cleanup();
      };

      document.documentElement.appendChild(style);
      document.body.appendChild(tip);
      document.addEventListener('mouseover', onMouseOver, true);
      document.addEventListener('mouseout', onMouseOut, true);
      document.addEventListener('mousedown', onMouseDown, true);
      document.addEventListener('mouseup', onMouseUp, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      activePageActionCleanup = cleanup;
      browser.runtime.sendMessage({ action: 'nanogpt_page_action_state', mode: 'selection', active: true });
    }

    function startImagePick() {
      if (document.getElementById('nanogpt-image-pick-tip')) return;

      const tip = document.createElement('div');
      tip.id = 'nanogpt-image-pick-tip';
      tip.textContent = 'Click an image to ask NanoGPT. Press Esc to cancel.';
      const style = document.createElement('style');
      style.id = 'nanogpt-image-pick-style';
      style.textContent = `
        #nanogpt-image-pick-tip {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2147483647;
          padding: 9px 12px;
          border-radius: 8px;
          background: #111827;
          color: #fff;
          font: 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,.25);
          pointer-events: none;
        }
        .nanogpt-image-pick-hover {
          outline: 3px solid #4dabf7 !important;
          outline-offset: 3px !important;
          cursor: crosshair !important;
        }
      `;
      document.documentElement.appendChild(style);
      document.body.appendChild(tip);

      let hovered = null;
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        if (hovered) hovered.classList.remove('nanogpt-image-pick-hover');
        tip.remove();
        style.remove();
        document.removeEventListener('mouseover', onMouseOver, true);
        document.removeEventListener('mouseout', onMouseOut, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
        if (activePageActionCleanup === cleanup) activePageActionCleanup = null;
        browser.runtime.sendMessage({ action: 'nanogpt_page_action_state', mode: 'image', active: false });
      };

      const getImageTarget = (target) => {
        if (!target || !target.closest) return null;
        return target.closest('img');
      };

      const onMouseOver = (event) => {
        const image = getImageTarget(event.target);
        if (!image || image === hovered) return;
        if (hovered) hovered.classList.remove('nanogpt-image-pick-hover');
        hovered = image;
        hovered.classList.add('nanogpt-image-pick-hover');
      };

      const onMouseOut = (event) => {
        const image = getImageTarget(event.target);
        if (image && image === hovered) {
          hovered.classList.remove('nanogpt-image-pick-hover');
          hovered = null;
        }
      };

      const onClick = async (event) => {
        const image = getImageTarget(event.target);
        if (!image) return;
        event.preventDefault();
        event.stopPropagation();
        cleanup();

        try {
          const imageUrl = await captureElementImage(image);
          await browser.runtime.sendMessage({
            action: 'nanogpt_circle_search_image',
            imageUrl,
            attachmentLabel: 'Image',
          });
        } catch (error) {
          alert(error && error.message ? error.message : String(error));
        }
      };

      const onKeyDown = (event) => {
        if (event.key === 'Escape') cleanup();
      };

      document.addEventListener('mouseover', onMouseOver, true);
      document.addEventListener('mouseout', onMouseOut, true);
      document.addEventListener('click', onClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      activePageActionCleanup = cleanup;
      browser.runtime.sendMessage({ action: 'nanogpt_page_action_state', mode: 'image', active: true });
    }

    function initFloatingIcon() {
      if (cleanupFloatingIcon) cleanupFloatingIcon();
      const existingIcon = document.getElementById('floating-nanogpt-icon');
      if (existingIcon) {
        existingIcon.remove();
      }

      const logoUrl = browser.runtime.getURL('logo.png');
      
      // Create floating icon
      const floatingIcon = document.createElement('div');
      floatingIcon.id = 'floating-nanogpt-icon';
      floatingIcon.innerHTML = `<img src="${logoUrl}" alt="NanoGPT">`;

      document.body.appendChild(floatingIcon);

      const applyFloatingIconCorner = (corner) => {
        floatingIconCorner = normalizeFloatingIconCorner(corner);
        const style = floatingIconPositionStyle(floatingIconCorner);
        floatingIcon.style.top = style.top;
        floatingIcon.style.right = style.right;
        floatingIcon.style.bottom = style.bottom;
        floatingIcon.style.left = style.left;
      };

      applyFloatingIconCorner(floatingIconCorner);

      // Show icon when mouse is near the right edge
      let isVisible = false;
      let dragging = false;
      let dragStart = null;
      let suppressNextClick = false;
      const onMouseMove = (e) => {
        const threshold = 100; // pixels from the closest configured edge
        const nearHorizontalEdge = floatingIconCorner.endsWith('right')
          ? e.clientX > window.innerWidth - threshold
          : e.clientX < threshold;
        const nearVerticalEdge = floatingIconCorner.startsWith('top')
          ? e.clientY < threshold
          : e.clientY > window.innerHeight - threshold;
        const shouldShow = nearHorizontalEdge || nearVerticalEdge || dragging;
        if (shouldShow === isVisible) return;
        isVisible = shouldShow;
        if (shouldShow) {
          floatingIcon.classList.add('visible');
        } else {
          floatingIcon.classList.remove('visible');
        }
      };

      document.addEventListener('mousemove', onMouseMove, { passive: true });

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        dragging = true;
        dragStart = { x: event.clientX, y: event.clientY };
        floatingIcon.classList.add('dragging', 'visible');
        floatingIcon.setPointerCapture?.(event.pointerId);
        event.preventDefault();
      };

      const onPointerMove = (event) => {
        if (!dragging) return;
        const moved = dragStart && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 4;
        if (!moved) return;
        floatingIcon.style.left = `${event.clientX - floatingIcon.offsetWidth / 2}px`;
        floatingIcon.style.top = `${event.clientY - floatingIcon.offsetHeight / 2}px`;
        floatingIcon.style.right = '';
        floatingIcon.style.bottom = '';
        suppressNextClick = true;
      };

      const onPointerUp = (event) => {
        if (!dragging) return;
        dragging = false;
        floatingIcon.classList.remove('dragging');
        floatingIcon.releasePointerCapture?.(event.pointerId);
        const moved = dragStart && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 4;
        dragStart = null;
        if (!moved) return;
        const nextCorner = nearestFloatingIconCorner(
          { x: event.clientX, y: event.clientY },
          { width: window.innerWidth, height: window.innerHeight },
        );
        applyFloatingIconCorner(nextCorner);
        browser.storage.local.set({ floatingIconCorner: nextCorner }).catch(() => undefined);
      };

      floatingIcon.addEventListener('pointerdown', onPointerDown);
      floatingIcon.addEventListener('pointermove', onPointerMove);
      floatingIcon.addEventListener('pointerup', onPointerUp);
      floatingIcon.addEventListener('pointercancel', onPointerUp);

      cleanupFloatingIcon = () => {
        document.removeEventListener('mousemove', onMouseMove);
        floatingIcon.removeEventListener('pointerdown', onPointerDown);
        floatingIcon.removeEventListener('pointermove', onPointerMove);
        floatingIcon.removeEventListener('pointerup', onPointerUp);
        floatingIcon.removeEventListener('pointercancel', onPointerUp);
        floatingIcon.remove();
        if (cleanupFloatingIcon) cleanupFloatingIcon = null;
      };

      // Open the extension chat from the floating page affordance.
      floatingIcon.addEventListener('click', (event) => {
        if (suppressNextClick) {
          suppressNextClick = false;
          event.preventDefault();
          return;
        }
        sendRuntimeMessage({ action: 'openPopup' }).then((response) => {
          if (response && response.ok === false) {
            showFloatingIconNotice('Firefox only lets extensions open the sidebar from the toolbar icon or keyboard shortcut.');
          }
        });
      });
    }
  });
})();
