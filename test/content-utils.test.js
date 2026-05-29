const test = require('node:test');
const assert = require('node:assert/strict');
const {
  floatingIconPositionStyle,
  isExtensionContextInvalidated,
  nearestFloatingIconCorner,
  normalizeFloatingIconCorner,
  screenshotCropRect,
  visibleRectFromElementRect,
} = require('../shared/content-utils');

test('isExtensionContextInvalidated detects Chromium and Firefox stale context errors', () => {
  assert.equal(isExtensionContextInvalidated(new Error('Extension context invalidated.')), true);
  assert.equal(isExtensionContextInvalidated(new Error('context invalidated')), true);
  assert.equal(isExtensionContextInvalidated(new Error('Other failure')), false);
});

test('visibleRectFromElementRect clips an element rect to the viewport', () => {
  assert.deepEqual(visibleRectFromElementRect({
    left: -10,
    top: 5,
    right: 90,
    bottom: 205,
  }, 80, 120), {
    left: 0,
    top: 5,
    width: 80,
    height: 115,
  });
});

test('screenshotCropRect maps viewport coordinates into screenshot pixels', () => {
  assert.deepEqual(screenshotCropRect(
    { left: 10, top: 20, width: 50, height: 40 },
    { width: 2000, height: 1000 },
    { width: 1000, height: 500 },
  ), {
    x: 20,
    y: 40,
    width: 100,
    height: 80,
  });
});

test('screenshotCropRect clips bounds beyond screenshot edges', () => {
  assert.deepEqual(screenshotCropRect(
    { left: 900, top: 400, width: 300, height: 200 },
    { width: 1000, height: 500 },
    { width: 1000, height: 500 },
  ), {
    x: 900,
    y: 400,
    width: 100,
    height: 100,
  });
});

test('floating icon corner helpers normalize, snap, and produce fixed-position offsets', () => {
  assert.equal(normalizeFloatingIconCorner('top-left'), 'top-left');
  assert.equal(normalizeFloatingIconCorner('nonsense'), 'bottom-right');
  assert.equal(nearestFloatingIconCorner({ x: 100, y: 50 }, { width: 1000, height: 800 }), 'top-left');
  assert.equal(nearestFloatingIconCorner({ x: 900, y: 700 }, { width: 1000, height: 800 }), 'bottom-right');
  assert.deepEqual(floatingIconPositionStyle('top-left', 16), {
    top: '16px',
    right: '',
    bottom: '',
    left: '16px',
  });
});
