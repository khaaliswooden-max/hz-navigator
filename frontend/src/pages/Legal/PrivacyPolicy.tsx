import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p>
            Welcome to HZ Navigator ("we," "our," or "us"). We are committed to protecting your 
            personal information and your right to privacy. This Privacy Policy explains how we 
            collect, use, disclose, and safeguard your information when you use our HUBZone 
            compliance management platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
          
          <h3 className="text-xl font-medium mb-3">2.1 Personal Information</h3>
          <p>We collect personal information that you voluntarily provide, including:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Name and contact information (email, phone number)</li>
            <li>Business information (company name, address, EIN)</li>
            <li>Employee information (names, addresses, employment dates)</li>
            <li>Account credentials (email and encrypted password)</li>
            <li>Documentation you upload for compliance verification</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">2.2 Automatically Collected Information</h3>
          <p>When you use our platform, we automatically collect:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Device information (browser type, operating system)</li>
            <li>IP address and geolocation data</li>
            <li>Usage data (pages visited, features used, timestamps)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide and maintain our HUBZone compliance services</li>
            <li>Verify employee residency for HUBZone qualification</li>
            <li>Calculate and track compliance percentages</li>
            <li>Send notifications about compliance status changes</li>
            <li>Process and manage your account</li>
            <li>Respond to inquiries and provide customer support</li>
            <li>Improve our platform and develop new features</li>
            <li>Ensure security and prevent fraud</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
          <p>We may share your information with:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Service Providers:</strong> Third parties who perform services on our behalf (hosting, analytics, email delivery)</li>
            <li><strong>Government Agencies:</strong> When required for HUBZone certification verification</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Encryption in transit (TLS 1.2+) and at rest (AES-256)</li>
            <li>Regular security audits and penetration testing</li>
            <li>Access controls and authentication requirements</li>
            <li>Secure cloud infrastructure (AWS)</li>
            <li>Regular backups and disaster recovery procedures</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide our services to you</li>
            <li>Comply with legal and regulatory requirements</li>
            <li>Resolve disputes and enforce agreements</li>
          </ul>
          <p>
            HUBZone compliance records are retained for 7 years as required by SBA regulations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
            <li><strong>Portability:</strong> Receive your data in a structured format</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
          </ul>
          <p>To exercise these rights, contact us at privacy@hz-navigator.com</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience. You can control 
            cookie preferences through your browser settings. For details, see our Cookie Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
          <p>
            Our platform is not intended for users under 18 years of age. We do not knowingly 
            collect information from children.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. We will notify you of material 
            changes via email or through the platform. Your continued use after changes 
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, contact us at:
          </p>
          <address className="not-italic mt-4">
            <strong>HZ Navigator</strong><br />
            Email: privacy@hz-navigator.com<br />
            Address: [Your Business Address]
          </address>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

