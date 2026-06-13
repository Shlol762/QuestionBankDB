import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Custom hook to automatically handle form input autofocus and auto-advance.
 * 
 * Features:
 * 1. Automatically focuses the first empty (or first available) field on render/step change.
 * 2. Intercepts the Enter key to move focus to the next field (or Ctrl + Enter for textareas).
 * 3. Auto-advances focus when a dropdown (select) value changes.
 */
export function useFormAutoAdvance(
  containerRef: RefObject<HTMLElement | null>,
  triggerDependency: any
) {
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find first focusable input/select/textarea inside the ref container
    const focusable = containerRef.current.querySelectorAll(
      'input:not([disabled]):not([type="hidden"]):not([type="file"]), select:not([disabled]), textarea:not([disabled])'
    ) as NodeListOf<HTMLElement>;
    
    if (focusable.length > 0) {
      // Find the first empty field, or default to the first one if all are filled
      const firstEmpty = Array.from(focusable).find(el => {
        if (el.tagName.toLowerCase() === 'select') return !(el as HTMLSelectElement).value;
        return !(el as HTMLInputElement).value;
      }) as HTMLElement;
      
      const targetFocus = firstEmpty || focusable[0];
      
      // Delay slightly to ensure component transitions have finished and elements are visible/interactable
      const timer = setTimeout(() => {
        if (document.activeElement !== targetFocus) {
          targetFocus.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [triggerDependency, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Intercept Enter key inside the container
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        
        // Let standard buttons submit normally on click, and ignore textarea returns unless Ctrl is held
        if (tagName === 'button') return;
        if (tagName === 'textarea' && !e.ctrlKey) return;

        // Prevent default form submission or newline
        e.preventDefault();

        // Get all interactable form elements in order
        const focusable = Array.from(
          container.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled]), button.next-step-btn:not([disabled])'
          )
        ) as HTMLElement[];

        const index = focusable.indexOf(target);
        if (index > -1 && index < focusable.length - 1) {
          focusable[index + 1].focus();
        } else if (index === focusable.length - 1) {
          // If we reached the final submit button or complete button, trigger click/submit
          const submitBtn = focusable[index];
          if (submitBtn.tagName.toLowerCase() === 'button') {
            submitBtn.click();
          } else {
            const form = container.querySelector('form');
            if (form) form.requestSubmit();
          }
        }
      }
    };

    // Intercept dropdown onChange to auto-advance focus
    const handleChange = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'select') {
        const focusable = Array.from(
          container.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled]), button.next-step-btn:not([disabled])'
          )
        ) as HTMLElement[];

        const index = focusable.indexOf(target);
        if (index > -1 && index < focusable.length - 1) {
          // Add a tiny delay to ensure select value updates are applied before shifting focus
          setTimeout(() => {
            focusable[index + 1].focus();
          }, 80);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('change', handleChange);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('change', handleChange);
    };
  }, [triggerDependency, containerRef]);
}
