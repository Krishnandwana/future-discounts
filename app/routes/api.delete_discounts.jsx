// routes/api/delete_discounts.js

import { authenticate } from '../shopify.server';

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Define the GraphQL mutation for discount code bulk deletion
    const mutation = `#graphql
      mutation discountAutomaticBulkDelete($search: String!) {
        discountAutomaticBulkDelete(search: $search) {
          job {
            id
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    `;

    // Set the search query to target expired percentage discounts
    const variables = {
      search: "type:Dicount:*" // Ensure this matches Shopify’s expected format
    };

    // Send the mutation request
    const response = await admin.graphql(mutation, variables);

    // Check for errors in the response
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    if (response.data.discountAutomaticBulkDelete.userErrors.length > 0) {
      throw new Error(response.data.discountAutomaticBulkDelete.userErrors[0].message);
    }

    // Return success response if no errors
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error deleting discounts:', error);

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};
