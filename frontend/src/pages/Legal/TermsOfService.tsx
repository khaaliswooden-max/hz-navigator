import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
          <p>
            By accessing or using HZ Navigator ("Service"), you agree to be bound by these 
            Terms of Service ("Terms"). If you disagree with any part of these terms, you 
            may not access the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
          <p>
            HZ Navigator is a compliance management platform designed to help businesses 
            track and maintain their HUBZone certification status. Our Service includes:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>HUBZone geographic verification for addresses</li>
            <li>Employee residency tracking and compliance calculation</li>
            <li>Document management for certification records</li>
            <li>Compliance monitoring and alerting</li>
            <li>Reporting and analytics tools</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
          
          <h3 className="text-xl font-medium mb-3">3.1 Registration</h3>
          <p>
            To use our Service, you must create an account with accurate, complete, and 
            current information. You are responsible for safeguarding your account credentials.
          </p>

          <h3 className="text-xl font-medium mb-3">3.2 Account Responsibilities</h3>
          <p>You agree to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Maintain the confidentiality of your account</li>
            <li>Notify us immediately of unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Not share account credentials with others</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Use the Service for any unlawful purpose</li>
            <li>Submit false or misleading information</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use automated systems to access the Service without permission</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Use the Service to harm others or violate their rights</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Accuracy</h2>
          <p>
            You are responsible for the accuracy of information you provide. The Service 
            relies on data from third-party sources (including the SBA and Census Bureau) 
            for HUBZone geographic boundaries. While we strive for accuracy, we cannot 
            guarantee that all geographic data is current or error-free.
          </p>
          <p className="mt-4 font-semibold">
            Important: HZ Navigator provides tools to assist with HUBZone compliance 
            tracking, but does not guarantee HUBZone certification. Official certification 
            determinations are made by the Small Business Administration (SBA).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Subscription and Payment</h2>
          
          <h3 className="text-xl font-medium mb-3">6.1 Pricing</h3>
          <p>
            Subscription fees are displayed on our pricing page and may be changed with 
            30 days notice. All fees are non-refundable except as required by law.
          </p>

          <h3 className="text-xl font-medium mb-3">6.2 Billing</h3>
          <p>
            Subscriptions are billed in advance on a monthly or annual basis. Your 
            subscription will automatically renew unless cancelled.
          </p>

          <h3 className="text-xl font-medium mb-3">6.3 Cancellation</h3>
          <p>
            You may cancel your subscription at any time. Cancellation takes effect at 
            the end of the current billing period.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned 
            by HZ Navigator and are protected by copyright, trademark, and other 
            intellectual property laws. You may not copy, modify, distribute, or create 
            derivative works without our express permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. User Content</h2>
          <p>
            You retain ownership of content you upload to the Service. By uploading 
            content, you grant us a license to use, store, and process that content 
            solely for providing the Service. You represent that you have the right 
            to upload such content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
          <p className="uppercase font-semibold">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF 
            ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF 
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="mt-4">
            We do not warrant that the Service will be uninterrupted, error-free, or 
            secure. We do not warrant the accuracy of HUBZone boundary data or compliance 
            calculations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
          <p className="uppercase font-semibold">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, HZ NAVIGATOR SHALL NOT BE LIABLE 
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
            INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING FROM 
            YOUR USE OF THE SERVICE.
          </p>
          <p className="mt-4">
            Our total liability shall not exceed the amount you paid us in the 12 months 
            preceding the claim.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless HZ Navigator and its officers, 
            directors, employees, and agents from any claims, damages, or expenses 
            arising from your use of the Service or violation of these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice, 
            for conduct that we believe violates these Terms or is harmful to other 
            users, us, or third parties, or for any other reason.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of the State of [Your State], 
            without regard to conflict of law principles. Any disputes shall be resolved 
            in the courts of [Your Jurisdiction].
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">14. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will provide 
            notice of material changes via email or through the Service. Continued use 
            after changes constitutes acceptance.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">15. Contact</h2>
          <p>
            Questions about these Terms should be sent to:
          </p>
          <address className="not-italic mt-4">
            <strong>HZ Navigator</strong><br />
            Email: legal@hz-navigator.com<br />
            Address: [Your Business Address]
          </address>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;

