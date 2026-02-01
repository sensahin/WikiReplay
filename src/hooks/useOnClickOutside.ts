import { useEffect, useRef } from 'react';

type OutsideHandler = (event: MouseEvent) => void;

const listeners = new Set<(event: MouseEvent) => void>();
let isListening = false;

const handleDocumentMouseDown = (event: MouseEvent) => {
  listeners.forEach((listener) => listener(event));
};

const ensureListener = () => {
  if (isListening) return;
  document.addEventListener('mousedown', handleDocumentMouseDown);
  isListening = true;
};

const cleanupListener = () => {
  if (!isListening || listeners.size > 0) return;
  document.removeEventListener('mousedown', handleDocumentMouseDown);
  isListening = false;
};

export const useOnClickOutside = <T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: OutsideHandler,
  enabled: boolean = true
) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent) => {
      const element = ref.current;
      if (!element || element.contains(event.target as Node)) return;
      handlerRef.current(event);
    };
    listeners.add(listener);
    ensureListener();
    return () => {
      listeners.delete(listener);
      cleanupListener();
    };
  }, [ref, enabled]);
};
