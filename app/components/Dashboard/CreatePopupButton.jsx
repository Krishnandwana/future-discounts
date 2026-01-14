import { Spinner } from '@shopify/polaris';

const baseButtonStyle = {
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '15px',
  fontWeight: 600,
  lineHeight: 1.2,
  minWidth: '11rem',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease'
};

const variantStyles = {
  primary: {
    background: '#008060',
    border: '1px solid #008060',
    color: '#FFFFFF'
  },
  secondary: {
    background: '#FFFFFF',
    border: '1px solid #008060',
    color: '#008060'
  }
};

export default function CreatePopupButton({
  onClick,
  isLoading,
  hasPopups,
  label,
  variant = 'primary',
  disabled = false
}) {
  const buttonLabel = label || (hasPopups ? 'Create New' : 'Create From Scratch');
  const mergedStyles = { ...baseButtonStyle, ...(variantStyles[variant] || variantStyles.primary) };
  const isDisabled = isLoading || disabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        ...mergedStyles,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.7 : 1
      }}
    >
      {isLoading ? (
        <Spinner accessibilityLabel="Loading spinner" size="small" />
      ) : (
        <span>{buttonLabel}</span>
      )}
    </button>
  );
}
