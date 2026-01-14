import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const extensionId = process.env.SHOPIFY_EXTENSION_ID;
  let appEmbedEnabled = false;

  try {
    // First, get the published theme ID via GraphQL
    const themesResponse = await admin.graphql(`
        #graphql
        query {
          themes(first: 10, roles: MAIN) {
            nodes {
              id
              name
              role
            }
          }
        }
      `);

    const themesData = await themesResponse.json();
    const publishedTheme = themesData?.data?.themes?.nodes?.[0];

    if (publishedTheme) {
      // Fetch settings_data.json using GraphQL
      const settingsResponse = await admin.graphql(
        `#graphql
          query getThemeSettings($id: ID!) {
            theme(id: $id) {
              files(filenames: ["config/settings_data.json"]) {
                nodes {
                  body {
                    ... on OnlineStoreThemeFileBodyText {
                      content
                    }
                  }
                }
              }
            }
          }`,
        {
          variables: {
            id: publishedTheme.id,
          },
        }
      );

      const settingsJson = await settingsResponse.json();
      const settingsContent = settingsJson.data?.theme?.files?.nodes?.[0]?.body?.content;

      if (settingsContent) {
        // Robust parsing: Strip comments by finding the first '{' and last '}'
        const jsonStart = settingsContent.indexOf('{');
        const jsonEnd = settingsContent.lastIndexOf('}');
        const cleanJson = (jsonStart !== -1 && jsonEnd !== -1)
          ? settingsContent.substring(jsonStart, jsonEnd + 1)
          : settingsContent;

        const settings = JSON.parse(cleanJson);

        // Check if our app embed is in the blocks and not disabled
        const appEmbeds = settings?.current?.blocks || {};

        // Our extension UID from environment
        const ourAppEmbed = Object.entries(appEmbeds).find(([key, value]) => {
          return key.includes(extensionId) ||
            key.includes('convertboost') ||
            key.includes('convert-boost') ||
            key.includes('geo-deals') ||
            value?.type?.includes(extensionId) ||
            value?.type?.includes('convertboost') ||
            value?.type?.includes('convert-boost') ||
            value?.type?.includes('geo-deals');
        });

        if (ourAppEmbed) {
          const [blockKey, blockData] = ourAppEmbed;
          appEmbedEnabled = blockData.disabled !== true;
        }
      }
    }

    return json({ success: true, enabled: appEmbedEnabled });
  } catch (error) {
    console.error('Error checking app embed status in API:', error.message);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
