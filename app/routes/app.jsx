import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import React, { useEffect } from "react";
import LiveChat from "../components/LiveChat";
import MicrosoftClarity from "../components/MicrosoftClarity";
import { logErrorToSlack } from "../utils/slackLogger";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  try {
    // Convert the environment variable to a proper boolean
    const isProd = process.env.prod?.toLowerCase() === "true";
    
    return json({ 
      apiKey: process.env.SHOPIFY_API_KEY || "",
      isProd: isProd
    });
  } catch (error) {
    // Add request context to the error
    if (error && typeof error === 'object') {
      error.request = {
        url: request.url,
        method: request.method
      };
    }
    
    logErrorToSlack(error);
    throw error;
  }
};

export default function App() {
  const { apiKey, isProd } = useLoaderData();

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "popupShownTime" && !event.newValue) {
        localStorage.removeItem("popupShown");
        localStorage.removeItem("popupShownTime");
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      {Boolean(isProd) && <MicrosoftClarity projectId="pa7jd4kawm" />}
      {Boolean(isProd) && <LiveChat/>}

      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/user_data">Leads</Link>
        <Link to="/app/billing">Billing</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("App route error:", error);
  
  // Log the error to Slack
  logErrorToSlack(error);
  
  return boundary.error(error);
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};