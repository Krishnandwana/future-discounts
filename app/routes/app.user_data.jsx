import { useEffect, useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  DatePicker,
  Popover,
  TextField,
  Banner,
  Icon,
  Pagination,
} from '@shopify/polaris';
import { useLoaderData } from '@remix-run/react';
import {
  CalendarIcon
} from '@shopify/polaris-icons';
import { authenticate } from '../shopify.server';
import LoaderComponent from '../components/LoaderComponent';
import * as XLSX from 'xlsx';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const accessToken = session.accessToken;
  const baseUrl = process.env.SHOPIFY_APP_URL;
  const shopName = session.shop;
  return { accessToken, baseUrl, shopName };
};

export default function UserDetailsPage() {
  const { accessToken, baseUrl } = useLoaderData();
  const [isLoading, setIsLoading] = useState(true);
  const [tabData, setTabData] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/user_details`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'access_token': accessToken,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }

        const data = await response.json();
        if (data.success) {
          setTabData(data.data);
          if (data.data.length > 0) {
            setFilteredData(data.data[0].csvData);
          }
        } else {
          throw new Error(data.error || 'Failed to fetch user details');
        }
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [accessToken, baseUrl]);

  useEffect(() => {
    if (tabData.length > 0) {
      filterData();
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [selectedTab, startDate, endDate, tabData]);

  const filterData = () => {
    const currentTabData = tabData[selectedTab]?.csvData || [];
    let filtered = [...currentTabData];

    if (startDate) {
      filtered = filtered.filter(row => new Date(row.generatedAt) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(row => new Date(row.generatedAt) <= new Date(endDate));
    }

    setFilteredData(filtered);
  };

  const handleTabChange = (index) => {
    setSelectedTab(index);
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleDownloadExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Create a sheet for each discount
      tabData.forEach((tab) => {
        const { discountName, userDataFields, csvData } = tab;

        // Filter the data if there are date filters
        let sheetData = [...csvData];
        if (startDate) {
          sheetData = sheetData.filter(row => new Date(row.generatedAt) >= new Date(startDate));
        }
        if (endDate) {
          sheetData = sheetData.filter(row => new Date(row.generatedAt) <= new Date(endDate));
        }

        // Prepare the data for Excel
        const headers = ['Coupon Code', 'Generated At', ...userDataFields.map(field =>
          field.charAt(0).toUpperCase() + field.slice(1)
        )];

        const excelData = sheetData.map(row => [
          row.couponCode,
          new Date(row.generatedAt).toLocaleString(),
          ...userDataFields.map(field => row[field] || '')
        ]);

        // Add headers to the beginning of the data
        excelData.unshift(headers);

        // Create the worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // Add column widths
        const colWidths = headers.map(() => ({ wch: 15 }));
        worksheet['!cols'] = colWidths;

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, discountName || 'Unknown Discount');
      });

      // Generate and download the Excel file
      XLSX.writeFile(workbook, 'user_details_export.xlsx');
    } catch (err) {
      console.error('Error generating Excel:', err);
      alert('Error generating Excel file');
    }
  };

  const handleDownloadCSV = (csvData, discountName, userDataFields) => {
    if (!csvData.length) {
      alert('No data to download');
      return;
    }

    const headers = ['Coupon Code', 'Generated At', ...userDataFields.map(field =>
      field.charAt(0).toUpperCase() + field.slice(1)
    )];
    const csvRows = [headers.join(',')];

    csvData.forEach((row) => {
      const values = [
        row.couponCode,
        new Date(row.generatedAt).toLocaleString(),
        ...userDataFields.map((field) => `"${row[field] || ''}"`)
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${discountName}_data.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  if (isLoading) return <LoaderComponent setIsLoading={setIsLoading} />;

  if (error) {
    return (
      <Page title="User Details">
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <Text variant="bodyMd" color="critical">Error: {error}</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!tabData.length) {
    return (
      <Page title="User Details">
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <Text variant="bodyMd">No user data available.</Text>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const selectedTabData = tabData[selectedTab];
  const { discountName, userDataFields } = selectedTabData;

  return (
    <Page fullWidth title="User Details">
      <div style={{ paddingInline: '1rem', paddingTop: '1rem' }}>
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {tabData.map((tab, index) => (
                  <button
                    key={tab.popupConfigId}
                    onClick={() => handleTabChange(index)}
                    style={{
                      backgroundColor: selectedTab === index ? '#f0f0f0' : '#ffffff',
                      border: `1px solid ${selectedTab === index ? '#f0f0f0' : '#e4e4e4'}`,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      outline: 'none',
                     marginBottom:'1rem',
                      transform: 'translateY(0)',
                      ':hover': {
                        backgroundColor: selectedTab === index ? '#f0f0f0' : '#f5f5f5',
                        transform: 'translateY(-1px)'
                      },
                      ':active': {
                        transform: 'translateY(1px)'
                      }
                    }}
                  >
                    {tab.discountName || 'Unknown Discount'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <Popover
                  active={showStartDatePicker}
                  activator={
                    <TextField
                      label="Start Date"
                      prefix={<Icon source={CalendarIcon} />}
                      value={startDate || 'Enter start date'}
                      onFocus={() => setShowStartDatePicker(true)}
                      autoComplete="off"
                    />
                  }
                  onClose={() => setShowStartDatePicker(false)}
                >
                  <DatePicker
                    month={startDate ? new Date(startDate).getMonth() : new Date().getMonth()}
                    year={startDate ? new Date(startDate).getFullYear() : new Date().getFullYear()}
                    onChange={({ start }) => {
                      setStartDate(start.toISOString().split('T')[0]);
                      setShowStartDatePicker(false);
                    }}
                    selected={startDate ? new Date(startDate) : undefined}
                  />
                </Popover>

                <Popover
                  active={showEndDatePicker}
                  activator={
                    <TextField
                      label="End Date"
                      value={endDate || 'Enter end date'}
                      prefix={<Icon source={CalendarIcon} />}
                      onFocus={() => setShowEndDatePicker(true)}
                      autoComplete="off"
                    />
                  }
                  onClose={() => setShowEndDatePicker(false)}
                >
                  <DatePicker
                    month={endDate ? new Date(endDate).getMonth() : new Date().getMonth()}
                    year={endDate ? new Date(endDate).getFullYear() : new Date().getFullYear()}
                    onChange={({ start }) => {
                      setEndDate(start.toISOString().split('T')[0]);
                      setShowEndDatePicker(false);
                    }}
                    selected={endDate ? new Date(endDate) : undefined}
                  />
                </Popover>
                <div style={{ marginBottom: '-1.2rem' }}>
                  <Button onClick={() => { setStartDate(''); setEndDate(''); }}>
                    Clear Filters
                  </Button>
                </div>
              </div>

              <Banner status="info" title="Total Records">
                {filteredData.length} records found (showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)})
              </Banner>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'end', gap: '1rem' }}>
                <Button onClick={() => handleDownloadCSV(filteredData, discountName, userDataFields)} primary>
                  Download CSV
                </Button>
                <Button onClick={handleDownloadExcel} primary>
                  Download Excel (All Sheets)
                </Button>
              </div>

              <div className="table-container">
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Coupon Code</th>
                      <th>Generated At</th>
                      {userDataFields.map((field) => (
                        <th key={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((row, i) => (
                      <tr key={i}>
                        <td>{row.couponCode}</td>
                        <td>{new Date(row.generatedAt).toLocaleString()}</td>
                        {userDataFields.map((field) => (
                          <td key={field}>{row[field] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                  <Pagination
                    label={`Page ${currentPage} of ${totalPages}`}
                    hasPrevious={currentPage > 1}
                    onPrevious={() => setCurrentPage(currentPage - 1)}
                    hasNext={currentPage < totalPages}
                    onNext={() => setCurrentPage(currentPage + 1)}
                  />
                </div>
              )}
            </Card>
          </Layout.Section>
        </Layout>

        <style>{`
.table-container {
  overflow-x: auto;
  margin-top: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  background-white;
}

.styled-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  color: #374151;
}

.styled-table thead tr {
  background-color: #f9fafb;
  border-bottom: none;
}

.styled-table th {
  padding: 16px;
  font-weight: 600;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 12px;
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  position: sticky;
  top: 0;
}

.styled-table th:first-child {
  border-top-left-radius: 0.5rem;
}

.styled-table th:last-child {
  border-top-right-radius: 0.5rem;
}

.styled-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.styled-table tbody tr {
  transition: all 0.2s ease;
}

.styled-table tbody tr:hover {
  background-color: #f3f4f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.styled-table tbody tr:nth-child(even) {
  background-color: #fafafa;
}

.styled-table tbody tr:last-child td:first-child {
  border-bottom-left-radius: 0.5rem;
}

.styled-table tbody tr:last-child td:last-child {
  border-bottom-right-radius: 0.5rem;
}

/* Column specific styles */
.styled-table td:first-child {
  font-weight: 500;
  color: #111827;
}

/* Status column styling - if you have one */
.status-cell {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background-color: #dcfce7;
  color: #166534;
}

.status-inactive {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Empty state styling */
.styled-table td.empty-cell {
  color: #9ca3af;
  font-style: italic;
}

/* Loading state animation */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.loading-row td {
  animation: pulse 1.5s infinite;
  background-color: #f3f4f6;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .styled-table th,
  .styled-table td {
    padding: 12px;
    font-size: 13px;
  }
  
  .table-container {
    margin-top: 1rem;
    border-radius: 0.375rem;
  }
}

/* Scrollbar styling */
.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
`}</style>
      </div>
    </Page>
  );
}