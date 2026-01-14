import React, { useEffect } from 'react';

const LiveChat = ({ license = "f3b15a96-c895-4e07-8d66-b5c4a49b22a5" }) => {
  useEffect(() => {
    // Inject Crisp script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = "${license}";
      (function() {
        const d = document;
        const s = d.createElement("script");
        s.src = "https://client.crisp.chat/l.js";
        s.async = 1;
        d.getElementsByTagName("head")[0].appendChild(s);
      })();
    `;

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      const addedScript = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
      if (addedScript) addedScript.remove();
      delete window.$crisp;
      delete window.CRISP_WEBSITE_ID;
    };
  }, [license]);

  return null;
};

export default LiveChat;