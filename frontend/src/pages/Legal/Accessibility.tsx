import React from 'react';

const Accessibility: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Accessibility Statement</h1>
      <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Commitment</h2>
          <p>
            HZ Navigator is committed to ensuring digital accessibility for people with 
            disabilities. We are continually improving the user experience for everyone 
            and applying the relevant accessibility standards.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Conformance Status</h2>
          <p>
            We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 
            Level AA standards. These guidelines explain how to make web content more 
            accessible for people with disabilities.
          </p>
          <p className="mt-4">
            As a platform supporting government contractors through the HUBZone program, 
            we also strive to comply with Section 508 of the Rehabilitation Act.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Accessibility Features</h2>
          <p>We have implemented the following accessibility features:</p>
          
          <h3 className="text-xl font-medium mb-3 mt-6">Navigation</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Skip navigation links to main content</li>
            <li>Consistent navigation structure across pages</li>
            <li>Keyboard-accessible menus and interactive elements</li>
            <li>Focus indicators for all interactive elements</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Visual Design</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Sufficient color contrast (minimum 4.5:1 ratio for text)</li>
            <li>Resizable text without loss of functionality</li>
            <li>No content that flashes more than 3 times per second</li>
            <li>Information is not conveyed by color alone</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Forms</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Labels associated with all form inputs</li>
            <li>Error messages clearly identify the problem</li>
            <li>Required fields are clearly indicated</li>
            <li>Form validation provides clear feedback</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Content</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Alternative text for images</li>
            <li>Headings used to structure content logically</li>
            <li>Links have descriptive text</li>
            <li>Tables have proper headers</li>
          </ul>

          <h3 className="text-xl font-medium mb-3">Technical</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>ARIA landmarks for page regions</li>
            <li>ARIA attributes for dynamic content</li>
            <li>Semantic HTML elements</li>
            <li>Compatible with screen readers</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Assistive Technologies</h2>
          <p>Our platform is tested with and supports:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Screen readers (NVDA, JAWS, VoiceOver)</li>
            <li>Screen magnification software</li>
            <li>Speech recognition software</li>
            <li>Keyboard-only navigation</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Browser Compatibility</h2>
          <p>
            We aim to support accessibility features in the following browsers:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Chrome (latest 2 versions)</li>
            <li>Firefox (latest 2 versions)</li>
            <li>Safari (latest 2 versions)</li>
            <li>Edge (latest 2 versions)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Known Limitations</h2>
          <p>
            Despite our efforts, some content may have accessibility limitations:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              <strong>Maps:</strong> Interactive map features may have limited 
              accessibility. Alternative text-based HUBZone lookups are available.
            </li>
            <li>
              <strong>PDF Documents:</strong> Some uploaded documents may not be 
              fully accessible. We provide OCR text extraction where possible.
            </li>
            <li>
              <strong>Third-party Content:</strong> Some embedded content from 
              external sources may not meet our accessibility standards.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of HZ Navigator. Please 
            let us know if you encounter accessibility barriers:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Email: accessibility@hz-navigator.com</li>
            <li>Phone: [Your Phone Number]</li>
            <li>Contact form: [Link to contact form]</li>
          </ul>
          <p className="mt-4">
            We try to respond to accessibility feedback within 5 business days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Assessment Methods</h2>
          <p>We assess accessibility through:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Automated testing tools (axe, WAVE)</li>
            <li>Manual testing with assistive technologies</li>
            <li>User testing with people with disabilities</li>
            <li>Regular accessibility audits</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Continuous Improvement</h2>
          <p>
            We are committed to continuously improving accessibility. Our roadmap includes:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Regular accessibility training for our development team</li>
            <li>Incorporating accessibility into our design and development process</li>
            <li>Regular accessibility audits</li>
            <li>Addressing user feedback promptly</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Formal Complaints</h2>
          <p>
            If you are not satisfied with our response to your accessibility concern, 
            you may file a complaint with the relevant regulatory authority.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Accessibility;

