export async function saveOrders(admin, session) {
  const shopDomain = session.shop;
  
  // Try to get all orders, fallback to 2 years if needed
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const fallbackDate = twoYearsAgo.toISOString();
  
  try {
    console.log('Attempting to fetch all orders from the shop...');
    
    // First try: Get all orders (no date filter)
    let bulkOperationQuery = `
      {
        orders {
          edges {
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                }
              }
              totalTaxSet {
                shopMoney {
                  amount
                }
              }
              customer {
                id
              }
              shippingAddress {
                city
                province
              }
              paymentGatewayNames
              lineItems {
                edges {
                  node {
                    id
                    quantity
                    product {
                      id
                      title
                    }
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    // The full mutation needs to be formatted properly
    const mutation = `
      mutation {
        bulkOperationRunQuery(
          query: """${bulkOperationQuery}"""
        ) {
          bulkOperation {
            id
            status
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

    console.log('Sending GraphQL query for all orders...');

    // Send the GraphQL request
    let response = await admin.graphql(
      mutation,
      { apiVersion: '2025-01' }
    );
    
    let responseJson = await response.json();
    console.log('GraphQL response:', JSON.stringify(responseJson, null, 2));
    
    // Check if there's an error that might indicate too much data
    if (responseJson.data?.bulkOperationRunQuery?.userErrors?.length > 0) {
      const errors = responseJson.data.bulkOperationRunQuery.userErrors;
      const hasDataError = errors.some(e => 
        e.message.toLowerCase().includes('too many') || 
        e.message.toLowerCase().includes('limit') ||
        e.message.toLowerCase().includes('timeout')
      );
      
      if (hasDataError) {
        console.log('Failed to fetch all orders, falling back to 2 years of data...');
        
        // Fallback: Use 2 years date filter
        bulkOperationQuery = `
          {
            orders(query: "created_at:>=${fallbackDate}") {
              edges {
                node {
                  id
                  name
                  createdAt
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  subtotalPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                  totalTaxSet {
                    shopMoney {
                      amount
                    }
                  }
                  customer {
                    id
                  }
                  shippingAddress {
                    city
                    province
                  }
                  paymentGatewayNames
                  lineItems {
                    edges {
                      node {
                        id
                        quantity
                        product {
                          id
                          title
                        }
                        originalUnitPriceSet {
                          shopMoney {
                            amount
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;
        
        // Recreate mutation with date filter
        const fallbackMutation = `
          mutation {
            bulkOperationRunQuery(
              query: """${bulkOperationQuery}"""
            ) {
              bulkOperation {
                id
                status
              }
              userErrors {
                field
                message
                code
              }
            }
          }
        `;

        console.log('Sending GraphQL query for 2 years of data...');
        response = await admin.graphql(
          fallbackMutation,
          { apiVersion: '2025-01' }
        );
        
        responseJson = await response.json();
        console.log('Fallback GraphQL response:', JSON.stringify(responseJson, null, 2));
      }
    }
    
    // Now set up the webhook subscription for receiving the results
    if (responseJson.data?.bulkOperationRunQuery?.bulkOperation?.id) {
      console.log('Bulk operation created successfully, setting up webhook...');
      
      const webhookMutation = `
        mutation {
          webhookSubscriptionCreate(
            topic: BULK_OPERATIONS_FINISH
            webhookSubscription: {
              format: JSON,
              callbackUrl: "https://go-backend-convertboost-154795163068.us-central1.run.app/"
            }
          ) {
            userErrors {
              field
              message
              code
            }
            webhookSubscription {
              id
            }
          }
        }
      `;

      const webhookResponse = await admin.graphql(
        webhookMutation,
        { apiVersion: '2025-01' }
      );
      
      const webhookResponseJson = await webhookResponse.json();
      console.log('Webhook subscription response:', JSON.stringify(webhookResponseJson, null, 2));
    }
    
    console.log('GraphQL requests sent successfully');
  } catch (error) {
    console.error("Error triggering GraphQL operation:", error);
    // Try to get more detailed error information
    if (error.response) {
      try {
        const errorDetail = await error.response.json();
        console.error("Error details:", JSON.stringify(errorDetail, null, 2));
      } catch (e) {
        console.error("Could not parse error response");
      }
    }
  }
}
