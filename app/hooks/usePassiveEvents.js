import { useEffect } from 'react';

/**
 * Hook to enable passive event listeners globally
 * This helps prevent "Added non-passive event listener" warnings
 * and improves scrolling performance
 */
export function usePassiveEvents() {
  useEffect(() => {
    // Save original addEventListener
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    
    // Override addEventListener to make certain events passive by default
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // Events that should be passive by default
      const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'mousewheel'];
      
      let newOptions = options;
      
      // If this is a passive event and options is not already set to make it non-passive
      if (passiveEvents.includes(type)) {
        if (typeof options === 'object') {
          // Only override if passive is not explicitly set to false
          if (options.passive !== false) {
            newOptions = {
              ...options,
              passive: true
            };
          }
        } else {
          // If options is not an object (or null), make it an object with passive: true
          newOptions = {
            passive: true,
            capture: options === true
          };
        }
      }
      
      // Call original addEventListener with potentially modified options
      return originalAddEventListener.call(this, type, listener, newOptions);
    };
    
    return () => {
      // Restore original addEventListener when component unmounts
      EventTarget.prototype.addEventListener = originalAddEventListener;
    };
  }, []);
}