import { json } from '@remix-run/node';
import prisma from '../db.server.js';


export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const sessionToken = request.headers.get('sessionToken'); // Get session token from headers

  if (!sessionToken || !id) {
    return json({ error: 'Session token and ID are required' }, { status: 400 });
  }

  try {
    // Fetch the session using the accessToken (sessionToken)
    const session = await prisma.session.findUnique({
      where: {
        accessToken: sessionToken,
      },
    });

    if (!session) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    const { shop } = session;

    // Fetch the Popup Configuration based on the shop name and id
    const popupConfig = await prisma.popupConfiguration.findFirst({
      where: {
        id: id,
        shopName: shop,
      },
    });

    if (!popupConfig) {
      return json({ error: 'Popup Configuration not found' }, { status: 404 });
    }

    // Return the entire Popup Configuration row
    return json(popupConfig, { status: 200 });
  } catch (error) {
    console.error('Error fetching Popup Configuration:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
