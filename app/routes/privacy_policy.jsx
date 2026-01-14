import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <header className="border-b pb-4">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last Updated: 31-Oct-2024</p>
        </header>

        <div className="prose max-w-none">
          <p>
            Geo Deals ("we," "us," or "our") values the privacy of our users ("you," "your"). 
            This Privacy Policy explains how we collect, use, and protect your personal information 
            when you use our services.
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">a. Information Provided by Shopify</h3>
            <p>
              When you install Geo Deals on your Shopify store, we may access and store 
              certain information provided by Shopify, including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Your store name, URL, and email address</li>
              <li>Access to discounts, orders, and relevant shop data</li>
              <li>Any other necessary information required for our app's functionality</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">b. Automatically Collected Information</h3>
            <p>We may automatically collect information about your interactions with the app, such as:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Usage data (e.g., pages viewed, time spent on features)</li>
              <li>Technical data (e.g., IP address, browser type, operating system)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">c. Customer Data</h3>
            <p>
              In some cases, we may collect customer data when necessary for location-based 
              discount services, including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Customer location data based on IP addresses</li>
              <li>Interaction data with pop-ups and discounts</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Provide and improve our services</li>
              <li>Track and manage location-based discounts on your store</li>
              <li>Analyze user behavior to optimize the app experience</li>
              <li>Ensure compliance with legal and regulatory obligations</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">3. Sharing Your Information</h2>
            <p>
              We do not sell or share your information with third parties for marketing purposes. 
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Service Providers: Trusted third-party vendors who help us operate our app.</li>
              <li>
                Legal Requirements: If required by law or to protect our rights, we may disclose 
                your information to comply with legal obligations.
              </li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We use industry-standard security measures to protect your information. However, 
              no method of transmission or electronic storage is 100% secure, and we cannot 
              guarantee absolute security.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p>
              We retain your information only for as long as necessary to fulfill the purposes 
              outlined in this policy or as required by law. For example, data related to pop-up 
              interactions and analytics will be kept only for [e.g., 7 days] before being 
              automatically deleted.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Access, update, or delete your personal information</li>
              <li>Object to or restrict the processing of your data</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at{' '}
              <a href="mailto:thedripxmedia@gmail.com" className="text-blue-600 hover:underline">
                thedripxmedia@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">7. Changes to this Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted 
              on this page with an updated "Last Updated" date.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data 
              practices, please contact us at:
            </p>
            <div className="mt-4">
              <p className="font-semibold">DripX Media</p>
              <p>
                Email:{' '}
                <a href="mailto:thedripxmedia@gmail.com" className="text-blue-600 hover:underline">
                  thedripxmedia@gmail.com
                </a>
              </p>
            </div>
          </section>

          <p className="mt-8 text-gray-600 italic">
            This privacy policy is intended as a general guide. It is recommended that you 
            consult with a legal professional to ensure compliance with local privacy laws 
            and regulations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;