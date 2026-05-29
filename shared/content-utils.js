(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NanoGPTContentUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function isExtensionContextInvalidated(error) {
    const message = error && error.message ? error.message : String(error || '');
    return message.includes('Extension context invalidated') || message.includes('context invalidated');
  }

  function visibleRectFromElementRect(rect, viewportWidth, viewportHeight) {
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(viewportWidth, rect.right);
    const bottom = Math.min(viewportHeight, rect.bottom);
    return {
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  function screenshotCropRect(bounds, imageSize, viewportSize) {
    const scaleX = imageSize.width / viewportSize.width;
    const scaleY = imageSize.height / viewportSize.height;
    const left = Math.max(0, Math.floor(bounds.left));
    const top = Math.max(0, Math.floor(bounds.top));
    const right = Math.min(viewportSize.width, Math.ceil(bounds.left + bounds.width));
    const bottom = Math.min(viewportSize.height, Math.ceil(bounds.top + bounds.height));
    const x = Math.max(0, Math.round(left * scaleX));
    const y = Math.max(0, Math.round(top * scaleY));
    const width = Math.max(1, Math.round((right - left) * scaleX));
    const height = Math.max(1, Math.round((bottom - top) * scaleY));

    return {
      x,
      y,
      width: Math.min(width, imageSize.width - x),
      height: Math.min(height, imageSize.height - y),
    };
  }

  function normalizeFloatingIconCorner(value) {
    return ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(value)
      ? value
      : 'bottom-right';
  }

  function nearestFloatingIconCorner(point, viewportSize) {
    const horizontal = point.x < viewportSize.width / 2 ? 'left' : 'right';
    const vertical = point.y < viewportSize.height / 2 ? 'top' : 'bottom';
    return `${vertical}-${horizontal}`;
  }

  function floatingIconPositionStyle(corner, offset = 20) {
    const normalized = normalizeFloatingIconCorner(corner);
    return {
      top: normalized.startsWith('top') ? `${offset}px` : '',
      right: normalized.endsWith('right') ? `${offset}px` : '',
      bottom: normalized.startsWith('bottom') ? `${offset}px` : '',
      left: normalized.endsWith('left') ? `${offset}px` : '',
    };
  }

  return {
    isExtensionContextInvalidated,
    floatingIconPositionStyle,
    nearestFloatingIconCorner,
    normalizeFloatingIconCorner,
    screenshotCropRect,
    visibleRectFromElementRect,
  };
});
