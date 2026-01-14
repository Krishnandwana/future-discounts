import React from 'react';
import { render } from '@testing-library/react';
import { AppProvider } from '@shopify/polaris';

const AllTheProviders = ({ children }) => {
  return (
    <AppProvider i18n={{}}>
      {children}
    </AppProvider>
  );
};

const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
