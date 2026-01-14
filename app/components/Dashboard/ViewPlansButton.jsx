import { InlineStack, Spinner } from '@shopify/polaris';

export default function ViewPlansButton({ onClick, isLoading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        backgroundColor: "#FFF4E5",
        color: "#B95000",
        border: "1px solid #FFD79D",
        borderRadius: "8px",
        padding: "8px 12px",
        cursor: (disabled || isLoading) ? "default" : "pointer",
        fontSize: "14px",
        fontWeight: 600,
        opacity: isLoading ? 0.7 : 1
      }}
    >
      {isLoading ? (
        <InlineStack gap="200" align="center">
          <Spinner size="small" />
          <span>Loading...</span>
        </InlineStack>
      ) : (
        "View Plans"
      )}
    </button>
  );
}
