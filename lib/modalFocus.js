export const MODAL_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function getModalFocusableElements(root) {
  return root ? [...root.querySelectorAll(MODAL_FOCUSABLE_SELECTOR)].filter(element => {
    if (element.closest?.("[inert]")) return false;
    if (typeof element.getClientRects === "function" && element.getClientRects().length === 0) return false;
    return true;
  }) : [];
}

export function trapModalTabKey(event, root, activeElement) {
  if (event.key !== "Tab" || !root) return false;

  const focusable = getModalFocusableElements(root);
  if (!focusable.length) {
    event.preventDefault();
    root.focus();
    return true;
  }

  const current = activeElement ?? (typeof document !== "undefined" ? document.activeElement : null);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const focusIsOutside = !current || !root.contains(current);

  if (event.shiftKey && (current === first || focusIsOutside)) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (current === last || focusIsOutside)) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}
