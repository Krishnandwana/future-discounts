export default function DashboardContainer({ children }) {
  return (
    <div style={{
      margin: "12px auto 24px",
      maxWidth: "950px",
      width: "100%",
      boxSizing: "border-box",
      background: "#ffffff",
      border: "1px solid #e1e3e5",
      borderRadius: "12px",
      padding: "16px"
    }}>
      {children}
    </div>
  );
}
