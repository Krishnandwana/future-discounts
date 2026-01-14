import React, { useEffect } from "react";

const MicrosoftClarity = ({ projectId }) => {
  useEffect(() => {
    // Check if Clarity script already exists to avoid duplication
    const clarityScriptId = "microsoft-clarity-script";
    if (!document.getElementById(clarityScriptId)) {
      // Initialize Microsoft Clarity
      const initClarity = () => {
        (function (c, l, a, r, i, t, y) {
          c[a] = c[a] || function () {
            (c[a].q = c[a].q || []).push(arguments);
          };
          t = l.createElement(r);
          t.async = 1;
          t.src = "https://www.clarity.ms/tag/" + i;
          t.id = clarityScriptId;
          y = l.getElementsByTagName(r)[0];
          y.parentNode.insertBefore(t, y);
        })(window, document, "clarity", "script", projectId);
      };

      initClarity();
    }

    // Cleanup (optional, typically not needed for analytics scripts)
    return () => {
      // Remove Clarity script on unmount if needed
      const clarityScript = document.getElementById(clarityScriptId);
      if (clarityScript) {
        clarityScript.remove();
      }
    };
  }, [projectId]); // Re-run if projectId changes

  return null; // No UI to render
};

export default MicrosoftClarity;