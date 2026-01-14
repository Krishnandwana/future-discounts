import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useRevalidator } from "@remix-run/react";
import {
  Card,
  Page,
  Layout,
  Text,
  Badge,
  DataTable,
  Button,
  Modal,
  TextField,
  Select,
  ButtonGroup,
  Banner,
  Spinner,
  Divider,
  Box,
  ProgressBar,
  List,
  EmptyState
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { authenticate } from "../shopify.server";
import { getLogLevel } from "../utils/metafields.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Get popup configurations
    const popupConfigs = await prisma.popupConfiguration.findMany({
      where: { shopName: shop },
      orderBy: { createdAt: 'desc' }
    });

    // Get basic analytics if available
    const totalPopups = popupConfigs.length;
    const activePopups = popupConfigs.filter(p => p.status).length;

    // Calculate additional analytics
    const discountTypes = {};
    const triggers = {};
    const locations = {};
    
    popupConfigs.forEach(config => {
      // Count discount types
      const type = config.discountType || 'automatic';
      discountTypes[type] = (discountTypes[type] || 0) + 1;
      
      // Count triggers
      const trigger = config.trigger || 'scroll';
      triggers[trigger] = (triggers[trigger] || 0) + 1;
      
      // Count location rules
      const locationRule = config.locationRules || 'everyWhere';
      locations[locationRule] = (locations[locationRule] || 0) + 1;
    });

    // Calculate averages
    const avgDiscountValue = totalPopups > 0 ? 
      popupConfigs.reduce((sum, p) => sum + (parseFloat(p.discountValue) || 0), 0) / totalPopups : 0;

    // Get metafields from Shopify
    const shopUrl = `https://${shop}`;
    const metafieldsResponse = await fetch(`${shopUrl}/admin/api/2024-01/metafields.json?namespace=convertboost`, {
      headers: {
        'X-Shopify-Access-Token': session.accessToken,
      },
    });

    let metafields = [];
    if (metafieldsResponse.ok) {
      const metafieldsData = await metafieldsResponse.json();
      metafields = metafieldsData.metafields || [];
    }

    // Get log level from GraphQL metafields
    const shopGid = `gid://shopify/Shop/${shop.split('.')[0]}`;
    const logLevel = await getLogLevel(admin, shopGid);

    return json({
      shop,
      metrics: {
        totalPopups,
        activePopups,
        inactivePopups: totalPopups - activePopups,
        avgDiscountValue: Math.round(avgDiscountValue * 100) / 100
      },
      analytics: {
        discountTypes,
        triggers,
        locations
      },
      popupConfigs: popupConfigs.map(config => ({
        id: config.id,
        discountName: config.discountName,
        discountType: config.discountType,
        discountValue: config.discountValue,
        status: config.status,
        createdAt: config.createdAt,
        selectedCountries: config.selectedCountries,
        locationRules: config.locationRules
      })),
      metafields: metafields.map(mf => ({
        id: mf.id,
        key: mf.key,
        value: mf.value,
        type: mf.type,
        description: mf.description || '',
        createdAt: mf.created_at,
        updatedAt: mf.updated_at
      })),
      logLevel
    });
  } catch (error) {
    console.error('Performance page loader error:', error);
    return json({
      shop,
      metrics: { totalPopups: 0, activePopups: 0, inactivePopups: 0, avgDiscountValue: 0 },
      analytics: { discountTypes: {}, triggers: {}, locations: {} },
      popupConfigs: [],
      metafields: [],
      logLevel: 'warn',
      error: 'Failed to load performance data'
    });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  
  if (action === "updateLogLevel") {
    try {
      const { admin } = await authenticate.admin(request);
      const logLevel = formData.get("logLevel");
      const shopGid = `gid://shopify/Shop/${session.shop.split('.')[0]}`;

      const { setLogLevel } = await import("../utils/metafields.server");
      const success = await setLogLevel(admin, shopGid, logLevel);

      if (success) {
        return json({ success: true, message: `Log level updated to: ${logLevel}`, action: "updateLogLevel" });
      } else {
        return json({ success: false, error: "Failed to update log level", action: "updateLogLevel" }, { status: 500 });
      }
    } catch (error) {
      return json({ success: false, error: error.message, action: "updateLogLevel" }, { status: 500 });
    }
  }

  if (action === "updateMetafield") {
    try {
      const metafieldId = formData.get("metafieldId");
      const value = formData.get("value");

      const shopUrl = `https://${session.shop}`;
      const response = await fetch(`${shopUrl}/admin/api/2024-01/metafields/${metafieldId}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': session.accessToken,
        },
        body: JSON.stringify({
          metafield: { value }
        })
      });

      if (response.ok) {
        return json({ success: true, message: "Metafield updated successfully", action: "updateMetafield" });
      } else {
        const errorData = await response.json();
        return json({ success: false, error: errorData, action: "updateMetafield" }, { status: 400 });
      }
    } catch (error) {
      return json({ success: false, error: error.message, action: "updateMetafield" }, { status: 500 });
    }
  }
  if (action === "wipeMetafields") {
    try {
      const shopUrl = `https://${session.shop}`;
      const listResponse = await fetch(`${shopUrl}/admin/api/2024-01/metafields.json?namespace=convertboost`, {
        headers: {
          'X-Shopify-Access-Token': session.accessToken,
        },
      });

      if (!listResponse.ok) {
        const errorData = await listResponse.json().catch(() => ({}));
        return json({ success: false, error: errorData }, { status: 400 });
      }

      const metafieldsPayload = await listResponse.json();
      const metafields = metafieldsPayload.metafields || [];

      if (metafields.length === 0) {
        return json({ success: true, message: "No convertboost metafields found to delete.", action: "wipeMetafields" });
      }

      const deleteResults = await Promise.allSettled(
        metafields.map(mf =>
          fetch(`${shopUrl}/admin/api/2024-01/metafields/${mf.id}.json`, {
            method: 'DELETE',
            headers: {
              'X-Shopify-Access-Token': session.accessToken,
            }
          })
        )
      );

      const failedDeletes = deleteResults.filter(result => result.status === 'rejected' || (result.value && !result.value.ok));

      if (failedDeletes.length > 0) {
        return json({
          success: false,
          error: `Failed to delete ${failedDeletes.length} metafield(s).`,
          deleted: metafields.length - failedDeletes.length,
          total: metafields.length,
          action: "wipeMetafields"
        }, { status: 500 });
      }

      return json({
        success: true,
        message: `Deleted ${metafields.length} metafield(s).`,
        action: "wipeMetafields"
      });
    } catch (error) {
      return json({ success: false, error: error.message, action: "wipeMetafields" }, { status: 500 });
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

export default function Performance() {
  const { shop, metrics, analytics, popupConfigs, metafields, logLevel: initialLogLevel, error } = useLoaderData();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const [showMetafields, setShowMetafields] = useState(false);
  const [editingMetafield, setEditingMetafield] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [selectedLogLevel, setSelectedLogLevel] = useState(initialLogLevel || 'warn');

  const wipeInProgress = fetcher.state === 'submitting' && fetcher.formData?.get('action') === 'wipeMetafields';
  const wipeResult = fetcher.data?.action === 'wipeMetafields' ? fetcher.data : null;

  const handleEditMetafield = useCallback((metafield) => {
    setEditingMetafield(metafield);
    setEditValue(metafield.value);
  }, []);

  const handleSaveMetafield = useCallback(() => {
    if (editingMetafield) {
      fetcher.submit(
        {
          action: "updateMetafield",
          metafieldId: editingMetafield.id,
          value: editValue
        },
        { method: "post" }
      );
      setEditingMetafield(null);
      setEditValue("");
    }
  }, [editingMetafield, editValue, fetcher]);

  const handleCancelEdit = useCallback(() => {
    setEditingMetafield(null);
    setEditValue("");
  }, []);

  useEffect(() => {
    if (wipeModalOpen && fetcher.state === 'idle' && wipeResult?.success) {
      setWipeModalOpen(false);
    }
  }, [wipeModalOpen, fetcher.state, wipeResult]);

  useEffect(() => {
    if (wipeResult?.success) {
      revalidator.revalidate();
    }
  }, [wipeResult, revalidator]);

  useEffect(() => {
    setSelectedLogLevel(initialLogLevel || 'warn');
  }, [initialLogLevel]);

  const handleLogLevelChange = useCallback((value) => {
    setSelectedLogLevel(value);
    fetcher.submit(
      { action: "updateLogLevel", logLevel: value },
      { method: "post" }
    );
  }, [fetcher]);

  const logLevelResult = fetcher.data?.action === 'updateLogLevel' ? fetcher.data : null;

  // Format popup data for table
  const popupTableData = popupConfigs.map(config => [
    config.discountName || 'Unnamed',
    <Badge status={config.status ? 'success' : 'warning'}>
      {config.status ? 'Active' : 'Inactive'}
    </Badge>,
    config.discountType,
    `${config.discountValue}%`,
    Array.isArray(config.selectedCountries) ? config.selectedCountries.join(', ') : config.selectedCountries || 'All',
    new Date(config.createdAt).toLocaleDateString()
  ]);

  // Format metafields for table
  const metafieldTableData = metafields.map(mf => [
    mf.key,
    mf.type,
    <Text truncate>{mf.value.length > 50 ? `${mf.value.substring(0, 50)}...` : mf.value}</Text>,
    new Date(mf.updatedAt).toLocaleDateString(),
    <Button size="micro" onClick={() => handleEditMetafield(mf)}>
      Edit
    </Button>
  ]);

  const MetricCard = ({ title, value, description, status = "info" }) => (
    <Card>
      <Box padding="400">
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{value}</Text>
          <Text variant="headingMd" as="h4">{title}</Text>
          {description && <Text variant="bodySm" color="subdued">{description}</Text>}
        </div>
      </Box>
    </Card>
  );

  return (
    <Page
      title="App Performance"
      subtitle={`Performance metrics and metadata for ${shop}`}
      secondaryActions={[
        {
          content: showMetafields ? 'Hide Metafields' : 'Show All Metafields',
          onAction: () => setShowMetafields(!showMetafields)
        }
      ]}
    >
      {error && (
        <Banner status="critical" title="Error loading performance data">
          <p>{error}</p>
        </Banner>
      )}

      <Layout>
        <Layout.Section>
          <div style={{ padding: '1rem' }}>
            <Card title="Debug Settings">
              <Box padding="400">
                <div style={{ maxWidth: '400px' }}>
                  <Select
                    label="Console Log Level"
                    options={[
                      { label: 'Debug (Show all logs)', value: 'debug' },
                      { label: 'Info (General information)', value: 'info' },
                      { label: 'Warn (Warnings & errors only - Default)', value: 'warn' },
                      { label: 'Error (Errors only)', value: 'error' },
                      { label: 'None (No console logs)', value: 'none' }
                    ]}
                    value={selectedLogLevel}
                    onChange={handleLogLevelChange}
                    helpText="Set to 'debug' to see detailed console logs for troubleshooting user issues. Users must refresh the app to see changes."
                  />
                  {logLevelResult && (
                    <Box paddingBlockStart="300">
                      <Banner
                        status={logLevelResult.success ? 'success' : 'critical'}
                        title={logLevelResult.success ? 'Log level updated' : 'Update failed'}
                      >
                        <p>{logLevelResult.success ? logLevelResult.message : logLevelResult.error}</p>
                      </Banner>
                    </Box>
                  )}
                </div>
              </Box>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section>
          <div style={{ padding: '1rem' }}>
            <Card title="App Metrics Overview">
              <div style={{ 
                padding: '1.5rem',
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '16px'
              }}>
              <MetricCard
                title="Total Popups"
                value={metrics.totalPopups}
                description="All popup configurations"
              />
              <MetricCard
                title="Active Popups"
                value={metrics.activePopups}
                description="Currently running popups"
                status="success"
              />
              <MetricCard
                title="Inactive Popups"
                value={metrics.inactivePopups}
                description="Disabled popup configurations"
                status="warning"
              />
              <MetricCard
                title="Avg. Discount"
                value={`${metrics.avgDiscountValue}%`}
                description="Average discount value"
              />
              </div>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section>
          <Layout.Section oneHalf>
            <div style={{ padding: '1rem' }}>
              <Card title="Discount Types">
                <Box padding="400">
                {Object.keys(analytics.discountTypes).length > 0 ? (
                  Object.entries(analytics.discountTypes).map(([type, count]) => (
                    <div key={type} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Text variant="bodyMd" capitalization="capitalize">{type}</Text>
                        <Text variant="bodyMd">{count}</Text>
                      </div>
                      <ProgressBar 
                        progress={(count / metrics.totalPopups) * 100} 
                        size="small"
                      />
                    </div>
                  ))
                ) : (
                  <Text alignment="center" color="subdued">No data available</Text>
                )}
                </Box>
              </Card>
            </div>
          </Layout.Section>
          
          <Layout.Section oneHalf>
            <div style={{ padding: '1rem' }}>
              <Card title="Trigger Types">
                <Box padding="400">
                {Object.keys(analytics.triggers).length > 0 ? (
                  Object.entries(analytics.triggers).map(([trigger, count]) => (
                    <div key={trigger} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Text variant="bodyMd" capitalization="capitalize">{trigger}</Text>
                        <Text variant="bodyMd">{count}</Text>
                      </div>
                      <ProgressBar 
                        progress={(count / metrics.totalPopups) * 100} 
                        size="small"
                      />
                    </div>
                  ))
                ) : (
                  <Text alignment="center" color="subdued">No data available</Text>
                )}
                </Box>
              </Card>
            </div>
          </Layout.Section>
        </Layout.Section>

        <Layout.Section>
          <div style={{ padding: '1rem' }}>
            <Card title="Geographic Targeting">
              <Box padding="400">
              {Object.keys(analytics.locations).length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px'
                }}>
                  {Object.entries(analytics.locations).map(([location, count]) => (
                    <div key={location} style={{ padding: '12px', border: '1px solid #e1e3e5', borderRadius: '8px' }}>
                      <Text variant="headingMd" as="h4" capitalization="capitalize">
                        {location === 'everyWhere' ? 'Everywhere' : location.replace(/([A-Z])/g, ' $1')}
                      </Text>
                      <Text variant="bodyLg">{count} popup{count !== 1 ? 's' : ''}</Text>
                      <ProgressBar 
                        progress={(count / metrics.totalPopups) * 100} 
                        size="small"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Text alignment="center" color="subdued">No location data available</Text>
              )}
              </Box>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section>
          <div style={{ padding: '1rem' }}>
            <Card title="Popup Configurations">
            {popupConfigs.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  'text',
                  'text',
                  'text',
                  'text',
                  'text',
                  'text'
                ]}
                headings={[
                  'Name',
                  'Status',
                  'Type',
                  'Discount Value',
                  'Target Countries',
                  'Created'
                ]}
                rows={popupTableData}
              />
            ) : (
              <Box padding="400">
                <Text alignment="center" color="subdued">
                  No popup configurations found
                </Text>
              </Box>
            )}
            </Card>
          </div>
        </Layout.Section>

        {showMetafields && (
          <Layout.Section>
            <div style={{ padding: '1rem' }}>
              <Card title="Metafields Management">
              <Box padding="400">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <Text variant="bodyMd" color="subdued">
                    Manage your app's metafields stored in Shopify. These contain configuration data and app state.
                  </Text>
                  <Button
                    tone="critical"
                    onClick={() => setWipeModalOpen(true)}
                    disabled={metafields.length === 0 || wipeInProgress}
                  >
                    Wipe Geo Deals Metafields
                  </Button>
                </div>
                {wipeResult && (
                  <Box paddingBlockStart="300">
                    <Banner
                      status={wipeResult.success ? 'success' : 'critical'}
                      title={wipeResult.success ? 'Metafields wiped' : 'Metafield wipe failed'}
                    >
                      <p>{wipeResult.success ? wipeResult.message : wipeResult.error || 'An unexpected error occurred.'}</p>
                    </Banner>
                  </Box>
                )}
              </Box>
              <Divider />
              {metafields.length > 0 ? (
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text', 
                    'text',
                    'text',
                    'text'
                  ]}
                  headings={[
                    'Key',
                    'Type',
                    'Value',
                    'Last Updated',
                    'Actions'
                  ]}
                  rows={metafieldTableData}
                />
              ) : (
                <Box padding="400">
                  <Text alignment="center" color="subdued">
                    No metafields found
                  </Text>
                </Box>
              )}
              </Card>
            </div>
          </Layout.Section>
        )}
      </Layout>

      <Modal
        open={wipeModalOpen}
        onClose={() => !wipeInProgress && setWipeModalOpen(false)}
        title="Wipe Geo Deals Metafields"
        primaryAction={{
          content: 'Wipe Metafields',
          destructive: true,
          onAction: () => fetcher.submit(
            { action: 'wipeMetafields' },
            { method: 'post' }
          ),
          loading: wipeInProgress
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setWipeModalOpen(false),
            disabled: wipeInProgress
          }
        ]}
      >
        <Modal.Section>
          <Text variant="bodyMd">
            This will delete every metafield in the `convertboost` namespace from Shopify. Active campaigns on the storefront will stop working until new data is published. Are you sure you want to continue?
          </Text>
        </Modal.Section>
      </Modal>

      {/* Edit Metafield Modal */}
      <Modal
        open={!!editingMetafield}
        onClose={handleCancelEdit}
        title="Edit Metafield"
        primaryAction={{
          content: 'Save',
          onAction: handleSaveMetafield,
          loading: fetcher.state === 'submitting'
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCancelEdit
          }
        ]}
      >
        <Modal.Section>
          {editingMetafield && (
            <>
              <Text variant="headingMd" as="h3">
                {editingMetafield.key}
              </Text>
              <Box paddingBlockStart="200">
                <Text variant="bodySm" color="subdued">
                  Type: {editingMetafield.type}
                </Text>
              </Box>
              <Box paddingBlockStart="400">
                <TextField
                  label="Value"
                  value={editValue}
                  onChange={setEditValue}
                  multiline={editValue.length > 100}
                  autoComplete="off"
                />
              </Box>
              {fetcher.data?.error && (
                <Box paddingBlockStart="400">
                  <Banner status="critical">
                    <p>Error: {JSON.stringify(fetcher.data.error)}</p>
                  </Banner>
                </Box>
              )}
              {fetcher.data?.success && (
                <Box paddingBlockStart="400">
                  <Banner status="success">
                    <p>Metafield updated successfully!</p>
                  </Banner>
                </Box>
              )}
            </>
          )}
        </Modal.Section>
      </Modal>
    </Page>
  );
}
