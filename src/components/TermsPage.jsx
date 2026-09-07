import { useState } from "react";
import { StaticPage } from "./ManifestComponents";

const SECTIONS = [
  { id: "services", title: "1. The Services" },
  { id: "accounts", title: "2. Accounts" },
  { id: "orders", title: "3. Orders, manifests, and delivery windows" },
  { id: "client-responsibilities", title: "4. Client responsibilities" },
  { id: "our-responsibilities", title: "5. Our responsibilities" },
  { id: "fees", title: "6. Fees and billing" },
  { id: "cancellations", title: "7. Cancellations and failed deliveries" },
  { id: "liability", title: "8. Liability" },
  { id: "suspension", title: "9. Suspension and termination" },
  { id: "confidentiality", title: "10. Confidentiality" },
  { id: "changes", title: "11. Changes to these terms" },
  { id: "governing-law", title: "12. Governing law" },
  { id: "contact", title: "13. Contact us" },
];

const H2 = ({ id, children }) => (
  <h2
    id={id}
    className="text-[15px] font-semibold text-[#3D3A36] mt-6 mb-2 scroll-mt-16"
  >
    {children}
  </h2>
);

const P = ({ children }) => (
  <p className="text-[14px] leading-relaxed text-[#5C5850] mb-3">{children}</p>
);

const List = ({ children }) => (
  <ul className="text-[14px] leading-relaxed text-[#5C5850] mb-3 pl-4 space-y-1.5 list-disc marker:text-[#B8B2A8]">
    {children}
  </ul>
);

const JumpToSection = () => {
  const [open, setOpen] = useState(false);

  const handleJump = (id) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mb-2 -mx-4 px-4 sticky top-0 z-10 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#EFEBE6]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3 text-[13px] font-medium text-[#5C5850]"
      >
        Jump to section
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="pb-3 max-h-[45vh] overflow-y-auto -mx-1 px-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleJump(s.id)}
              className="block w-full text-left py-2 px-2 rounded-lg text-[13px] text-[#5C5850] active:bg-[#EFEBE6]"
            >
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const TermsPage = ({ onBack }) => (
  <StaticPage title="Terms of service" onBack={onBack}>
    <p className="text-[#8A8983] text-[12px] mb-1">
      Last updated: September 3, 2026
    </p>

    <JumpToSection />

    <H2 id="services">1. The Services</H2>
    <P>
      Tuuraa provides managed last-mile delivery services to businesses,
      including manifest-based dispatch, dedicated rider assignment, and
      structured delivery windows within our operating zones. Services are
      offered either through a subscription plan (Spark through Scale) or on a
      self-serve, pay-per-order basis, as described on our website or booking
      page.
    </P>
    <P>
      Our current operating area, service tiers, and pricing are set out on our
      website or provided to you at the time of booking or contract signing, and
      may be updated from time to time.
    </P>

    <H2 id="accounts">2. Accounts</H2>
    <P>
      To use most features of the Services you must create an account and
      provide accurate, current, and complete business and contact information.
      You are responsible for maintaining the confidentiality of your login
      credentials and for all activity under your account. Notify us immediately
      of any unauthorized use.
    </P>

    <H2 id="orders">3. Orders, manifests, and delivery windows</H2>
    <P>
      Each delivery request ("drop") you submit is grouped into a manifest and
      assigned to a rider or operator for pickup and delivery. Delivery windows
      and status updates (such as pending, assigned, out for delivery, and
      completed) reflect our best operational estimate and are not guarantees of
      an exact delivery time, unless expressly agreed in a separate written
      service level agreement.
    </P>
    <P>
      You are responsible for providing accurate pickup and delivery addresses,
      recipient contact details, and package information. We are not liable for
      delays or failed deliveries caused by inaccurate or incomplete information
      you provide.
    </P>

    <H2 id="client-responsibilities">4. Client responsibilities</H2>
    <P>As a Client, you agree to:</P>
    <List>
      <li>
        Ensure packages are lawful, safely packaged, and accurately described;
      </li>
      <li>
        Not tender prohibited, hazardous, illegal, or restricted items for
        delivery, including but not limited to weapons, controlled substances,
        and counterfeit goods;
      </li>
      <li>
        Have goods available for pickup, and a recipient available to receive
        delivery, within the agreed windows; and
      </li>
      <li>Pay all fees due for the Services in accordance with Section 6.</li>
    </List>
    <P>
      We reserve the right to refuse to transport any item that we reasonably
      believe violates these Terms or applicable law.
    </P>

    <H2 id="our-responsibilities">5. Our responsibilities</H2>
    <P>
      We will use commercially reasonable efforts to assign, dispatch, and
      complete deliveries in line with your selected service tier. We are not a
      common carrier and do not guarantee uninterrupted or error-free service.
      We may use employees, contracted riders, or third-party delivery operators
      to fulfil deliveries on our behalf.
    </P>

    <H2 id="fees">6. Fees and billing</H2>
    <P>
      Subscription clients are billed according to their selected plan and
      billing cycle. Pay-per-order clients are billed per completed order at the
      rate shown at the time of booking. Invoices are made available through the
      admin portal or sent by email, and payment is due within the timeframe
      stated on the invoice.
    </P>
    <P>
      Late or failed payments may result in suspension of Services until
      outstanding amounts are settled. Fees are exclusive of applicable taxes
      unless stated otherwise. We may change our pricing on reasonable notice;
      continued use after a price change takes effect constitutes acceptance of
      the new pricing.
    </P>

    <H2 id="cancellations">7. Cancellations and failed deliveries</H2>
    <P>
      Cancellation terms, and any fees for cancelled, returned, or failed
      deliveries (for example, where a recipient is unavailable or unreachable),
      are set out in your service agreement or on our booking page. Where none
      apply, we will act reasonably in determining any applicable charge.
    </P>

    <H2 id="liability">8. Liability</H2>
    <P>
      To the maximum extent permitted by law, our total liability arising out of
      or relating to the Services, whether in contract, tort, or otherwise, is
      limited to the fees paid by you for the specific order or billing period
      giving rise to the claim. We are not liable for indirect, incidental,
      special, or consequential damages, including loss of profits or business
      opportunity, except where such liability cannot be excluded under
      applicable Nigerian law.
    </P>
    <P>
      We are not liable for delays, loss, or damage caused by circumstances
      beyond our reasonable control, including but not limited to traffic,
      weather, civil unrest, or acts of third parties. Claims for loss or damage
      to goods in transit must be reported to us within a reasonable time after
      the scheduled delivery, and any compensation is subject to the terms of
      your service agreement.
    </P>

    <H2 id="suspension">9. Suspension and termination</H2>
    <P>
      We may suspend or terminate your access to the Services, with or without
      notice, if you breach these Terms, fail to pay amounts due, or use the
      Services in a manner that poses a risk to Tuuraa, our riders, or other
      users. You may cancel your subscription or stop using the Services at any
      time, subject to any outstanding payment obligations.
    </P>

    <H2 id="confidentiality">10. Confidentiality</H2>
    <P>
      Each party agrees to keep confidential any non-public business information
      disclosed by the other party in connection with the Services, and to use
      it only for purposes of performing under these Terms. This does not
      restrict the use of order and delivery data by Tuuraa as described in our
      Privacy Policy.
    </P>

    <H2 id="changes">11. Changes to these terms</H2>
    <P>
      We may update these Terms from time to time. We will update the "Last
      updated" date above and, where changes are material, provide additional
      notice through the Services or by email. Continued use of the Services
      after changes take effect constitutes acceptance of the updated Terms.
    </P>

    <H2 id="governing-law">12. Governing law</H2>
    <P>
      These Terms are governed by the laws of the Federal Republic of Nigeria.
      Any dispute arising out of or relating to these Terms shall be subject to
      the exclusive jurisdiction of the courts of Lagos State, Nigeria.
    </P>

    <H2 id="contact">13. Contact us</H2>
    <P>If you have questions about these Terms, contact us at:</P>
    <P>
      Tuuraa Logistics
      <br />
      Lagos, Nigeria
      <br />
      Email: support@tuuraalogistics.com
    </P>
  </StaticPage>
);
