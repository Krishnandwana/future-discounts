export default function DashboardStyles() {
  const styles = `
      body {
        overflow-y: auto;
        background: #f6f6f7;
      }
      @media (max-width: 768px) {
        .Polaris-Page {
          padding: 12px !important;
        }
      }
      .switch-container {
        position: relative;
        display: inline-block;
      }
      .switch-input {
        display: none;
      }
      .switch-label {
        display: block;
        width: 36px;
        height: 20px;
        background-color: #e4e4e4;
        border-radius: 20px;
        cursor: pointer;
        position: relative;
        transition: background-color 0.2s;
      }
      .switch-label::after {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: white;
        top: 2px;
        left: 2px;
        transition: left 0.2s;
      }
      .switch-input:checked + .switch-label {
        background-color: #008060;
      }
      .switch-input:checked + .switch-label::after {
        left: 18px;
      }
      .switch-input:disabled + .switch-label {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .subscription-required-tag {
        background-color: #FFF4E5;
        color: #B95000;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: 500;
        margin-left: 8px;
      }
      .card-hover {
        transition: all 0.2s ease;
      }
      .card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .feature-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
      }


      .analytics-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 16px 12px;
        transition: all 0.2s ease;
      }

      .analytics-card:hover {
        background-color: #F9FAFB;
      }

      .analytics-value {
        font-size: 24px;
        font-weight: 600;
        margin: 4px 0;
      }

      .quick-metric {
        text-align: center;
        padding: 8px 12px;
        background-color: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e1e3e5;
        min-width: 80px;
      }

      .quick-metric:hover {
        background-color: #f4f6f8;
        border-color: #c9cccf;
      }

      .popup-card-enhanced {
        border: 1px solid #e1e3e5;
        border-radius: 12px;
        transition: all 0.2s ease;
      }

      .popup-card-enhanced:hover {
        border-color: #008060;
        box-shadow: 0 4px 12px rgba(0, 128, 96, 0.1);
      }

      .analytics-overview {
        background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }
    `;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: styles
      }}
    />
  );
}
