import { StaticPage } from "./ManifestComponents";

export const PrivacyPage = ({ onBack }) => (
  <StaticPage title="Privacy policy" onBack={onBack}>
    <p className="text-[#8A8983] text-[13px]">
      Last updated: September 3, 2026
    </p>

    <p>
      Tura Logistics Limited ("Tuuraa," "we," "us," or "our") provides managed
      last-mile delivery services to businesses in Lagos, Nigeria. This Privacy
      Policy explains how we collect, use, disclose, and safeguard information
      when you use our website, admin portal, rider application, booking flow,
      or any other service that links to this policy (together, the "Services").
    </p>
    <p>
      By using our Services, you agree to the collection and use of information
      in accordance with this policy. If you do not agree, please do not use the
      Services.
    </p>

    <h2>1. Information we collect</h2>
    <p>
      <strong>Business and account information:</strong> business name, contact
      person name, phone number, email address, delivery addresses, and any
      information you provide when you register for an account, request a quote,
      or sign up for a subscription plan.
    </p>
    <p>
      <strong>Order and delivery data:</strong> manifest and drop details,
      pickup and delivery addresses, recipient names and phone numbers, package
      descriptions, delivery instructions, delivery status and timestamps,
      proof-of-delivery records, and rider assignment data.
    </p>
    <p>
      <strong>Payment information:</strong> billing details and invoice records.
      Card and bank transfer payments are processed by third-party payment
      processors; we do not store full card numbers on our servers.
    </p>
    <p>
      <strong>Communications:</strong> messages you send us through WhatsApp,
      email, or our booking form, including order confirmations and support
      requests.
    </p>
    <p>
      <strong>Technical data:</strong> log data, device and browser information,
      IP address, and usage data collected automatically when you interact with
      our admin portal, rider app, or website.
    </p>
    <p>
      <strong>Rider information:</strong> for individuals operating as Tuuraa
      riders or operators, we additionally collect identity verification
      details, contact information, and delivery performance and location data
      necessary to assign and track deliveries.
    </p>

    <h2>2. How we use your information</h2>
    <p>We use the information we collect to:</p>
    <ul>
      <li>Create and manage your account and client relationship;</li>
      <li>
        Process, assign, dispatch, and track deliveries, including communicating
        delivery status to you and your customers;
      </li>
      <li>Process payments and issue invoices;</li>
      <li>
        Provide customer support and respond to your inquiries or complaints;
      </li>
      <li>
        Send you service-related communications, including order updates,
        account notices, and changes to our terms or policies;
      </li>
      <li>Improve, secure, and develop our Services;</li>
      <li>
        Detect, investigate, and prevent fraud, abuse, or security incidents;
        and
      </li>
      <li>Comply with our legal and regulatory obligations.</li>
    </ul>
    <p>
      We do not sell your personal information to third parties, and we do not
      use your order or delivery data for advertising purposes.
    </p>

    <h2>3. Legal basis for processing</h2>
    <p>
      Where the Nigeria Data Protection Act 2023 or similar law applies, we
      process your information on the following bases: performance of a contract
      with you (for example, to fulfil a delivery); our legitimate interests in
      operating and improving the Services, in a manner that does not override
      your rights; compliance with a legal obligation; and, where applicable,
      your consent.
    </p>

    <h2>4. How we share information</h2>
    <p>We may share information with:</p>
    <ul>
      <li>
        <strong>Riders and delivery operators</strong> assigned to fulfil your
        orders, limited to the details needed to complete the delivery;
      </li>
      <li>
        <strong>Service providers</strong> who support our operations, including
        cloud hosting and database infrastructure, payment processing, email
        delivery, and messaging platforms such as the WhatsApp Business
        platform, under contractual obligations to protect your information;
      </li>
      <li>
        <strong>Professional advisers</strong> such as auditors, insurers, or
        legal counsel, where necessary; and
      </li>
      <li>
        <strong>Regulators, law enforcement, or courts</strong>, where required
        by law or to protect our rights, property, or the safety of our users.
      </li>
    </ul>
    <p>
      If Tuuraa is involved in a merger, acquisition, financing, or sale of
      assets, information may be transferred as part of that transaction,
      subject to this policy or a policy at least as protective.
    </p>

    <h2>5. Data storage and international transfers</h2>
    <p>
      We use third-party cloud infrastructure providers to store and process
      data, which may involve transferring information outside Nigeria. Where
      this occurs, we take reasonable steps to ensure the recipient provides an
      adequate level of protection consistent with applicable data protection
      law.
    </p>

    <h2>6. Data retention</h2>
    <p>
      We retain business, order, and payment information for as long as your
      account is active and for a reasonable period afterward to meet our legal,
      accounting, tax, and dispute-resolution obligations, after which it is
      securely deleted or anonymized.
    </p>

    <h2>7. Data security</h2>
    <p>
      We use administrative, technical, and physical safeguards designed to
      protect your information, including access controls and encryption in
      transit. No system is completely secure, and we cannot guarantee absolute
      security of information transmitted to us.
    </p>

    <h2>8. Your rights</h2>
    <p>Subject to applicable law, you may have the right to:</p>
    <ul>
      <li>Access the personal information we hold about you;</li>
      <li>Request correction of inaccurate or incomplete information;</li>
      <li>
        Request deletion of your information, subject to our legal and
        operational retention needs;
      </li>
      <li>Object to or restrict certain processing; and</li>
      <li>Withdraw consent, where processing is based on consent.</li>
    </ul>
    <p>
      To exercise any of these rights, contact us using the details below. We
      may need to verify your identity before acting on your request.
    </p>

    <h2>9. Cookies and similar technologies</h2>
    <p>
      Our website and portals may use cookies and similar technologies to keep
      you logged in, remember preferences, and understand how our Services are
      used. You can control cookies through your browser settings; disabling
      them may affect some features.
    </p>

    <h2>10. Children's privacy</h2>
    <p>
      Our Services are intended for business use and are not directed to
      individuals under 18. We do not knowingly collect personal information
      from children.
    </p>

    <h2>11. Changes to this policy</h2>
    <p>
      We may update this Privacy Policy from time to time. We will update the
      "Last updated" date above and, where changes are material, provide
      additional notice through the Services or by email.
    </p>

    <h2>12. Contact us</h2>
    <p>
      If you have questions about this Privacy Policy or how we handle your
      information, contact us at:
    </p>
    <p>
      Tura Logistics Limited (Tuuraa)
      <br />
      Lagos, Nigeria
      <br />
      Email: privacy@tuuraa.com
    </p>
  </StaticPage>
);
