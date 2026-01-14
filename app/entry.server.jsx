// app/entry.server.jsx

import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";
import { logErrorToSlack } from './utils/slackLogger';

const ABORT_DELAY = 5000;

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
        abortDelay={ABORT_DELAY}
      />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error) {
          // Add request context to the error
          if (error && typeof error === 'object') {
            error.request = {
              url: request.url,
              method: request.method,
              headers: Object.fromEntries(request.headers.entries())
            };
          }
          
          logErrorToSlack(error);  // Log server-side shell errors
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error("Server-side error:", error);
          
          // Add request context to the error
          if (error && typeof error === 'object') {
            error.request = {
              url: request.url,
              method: request.method,
              headers: Object.fromEntries(request.headers.entries())
            };
          }
          
          logErrorToSlack(error);  // Log other server-side errors
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}