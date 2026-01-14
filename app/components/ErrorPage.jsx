// app/components/ErrorPage.jsx

import React from 'react';

export default function ErrorPage() {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong!</title>
        <style>
          {`
            body {
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f8f9fa;
              color: #333;
            }
            .error-container {
              text-align: center;
              max-width: 400px;
              padding: 20px;
              border-radius: 8px;
              background-color: #fff;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            .error-title {
              font-size: 1.3rem;
              margin-bottom: 20px;
              color: #5d5d5d;
              font-weight:600;
            }
            .error-message {
              margin: 20px 0;
              font-size: 1rem;
              color: #6c757d;
            }
            .refresh-button {
              padding: 7px 17px;
              font-size: 1rem;
              background-color: #167b68;
              color: #fff;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            .refresh-button:hover {
              background-color: #429384;
            }
          `}
        </style>
      </head>
      <body>
        <div className="error-container">
          <h1 className="error-title"> Please refresh the page to continue.</h1>
          <button
            className="refresh-button"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </body>
    </html>
  );
}