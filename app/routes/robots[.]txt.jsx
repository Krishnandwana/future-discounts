import { json } from "@remix-run/node";

export let loader = async () => {
  const robotsTxt = `
    User-agent: *
    Disallow: /
  `.trim();

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};

export default function RobotsTxt() {
  return null;
}