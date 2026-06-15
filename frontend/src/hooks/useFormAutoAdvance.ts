import { useEffect, useRef } from 'react';
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
  triggerDependency: unknown,
  isHighRisk: boolean = false
) {
  const lastTriggerTimeRef = useRef<number>(0);

  useEffect(() => {
    lastTriggerTimeRef.current = Date.now();
  }, [triggerDependency]);
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

        // Separate inputs/selects/textareas from submit/next buttons
        const inputs = Array.from(
          container.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
          )
        ) as HTMLElement[];

        const buttons = Array.from(
          container.querySelectorAll(
            'button[type="submit"]:not([disabled]), button.next-step-btn:not([disabled])'
          )
        ) as HTMLElement[];

        const allFocusable = [...inputs, ...buttons];
        const indexInInputs = inputs.indexOf(target);

        if (indexInInputs > -1) {
          if (indexInInputs < inputs.length - 1) {
            // Move to next input field
            inputs[indexInInputs + 1].focus();
          } else {
            // We are at the last input field!
            if (isHighRisk) {
              // High risk: focus the submit/confirm button first
              if (buttons.length > 0) {
                buttons[0].focus();
              }
            } else {
              // Low risk: submit immediately!
              const form = container.querySelector('form');
              if (form) {
                form.requestSubmit();
              } else if (buttons.length > 0) {
                buttons[0].click();
              }
            }
          }
        } else {
          // If the focus is already on a button, navigate or submit
          const indexInAll = allFocusable.indexOf(target);
          if (indexInAll > -1 && indexInAll < allFocusable.length - 1) {
            allFocusable[indexInAll + 1].focus();
          } else if (indexInAll === allFocusable.length - 1) {
            const submitBtn = allFocusable[indexInAll];
            if (submitBtn.tagName.toLowerCase() === 'button') {
              submitBtn.click();
            } else {
              const form = container.querySelector('form');
              if (form) form.requestSubmit();
            }
          }
        }
      }
    };

    // Intercept dropdown onChange to auto-advance focus
    const handleChange = (e: Event) => {
      // Ignore programmatic (non-user-triggered) events and events fired too quickly after initialization/render
      if (!e.isTrusted) return;
      if (Date.now() - lastTriggerTimeRef.current < 500) return;

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
  }, [triggerDependency, containerRef, isHighRisk]);
}
