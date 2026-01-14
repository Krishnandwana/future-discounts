import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "@remix-run/react";
import { logErrorToSlack } from './utils/slackLogger';
import { logFrontendErrorToSlack } from './utils/frontendLogger';
import ErrorPage from './components/ErrorPage';
import { useEffect } from 'react';

export function ErrorBoundary({ error }) {

  // Log the error to Slack with the full error object
  if (typeof window === 'undefined') {
    // Server-side error
  logErrorToSlack(error);
  } else {
    // Client-side error
    logFrontendErrorToSlack(error);
  }

  return <ErrorPage />;
}

export default function App() {
  useEffect(() => {
    // Set up global error handler for uncaught exceptions
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      logFrontendErrorToSlack(error || message, { source, lineno, colno });
      
      // Call the original handler if it exists
      if (typeof originalOnError === 'function') {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    // Set up handler for unhandled promise rejections
    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      logFrontendErrorToSlack(event.reason, { type: 'unhandledRejection' });
      
      // Call the original handler if it exists
      if (typeof originalOnUnhandledRejection === 'function') {
        return originalOnUnhandledRejection(event);
      }
    };
    
    return () => {
      // Restore original handlers when component unmounts
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  }, []);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}