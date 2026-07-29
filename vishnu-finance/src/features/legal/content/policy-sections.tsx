import Link from 'next/link';
import { formatRegisteredAddress, isRegisteredAddressConfigured, legalConfig } from '@/lib/legal-config';

export function TermsContent() {
  const { brandName, legalName, supportEmail, refundBusinessDays, websiteUrl } = legalConfig;

  return (
    <>
      <h2>1. Introduction</h2>
      <p>
        These Terms and Conditions (&quot;Terms&quot;) govern your use of {brandName} (the &quot;Service&quot;),
        operated by {legalName} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), an individual proprietorship
        registered in India. By creating an account or using the Service, you agree to these Terms.
      </p>

      <h2>2. Description of service</h2>
      <p>
        {brandName} is a personal finance management application that helps you track income and expenses,
        import bank statements, set financial goals, receive AI-assisted insights, and manage related financial
        planning features. The Service is provided digitally via web and mobile applications.
      </p>

      <h2>3. Account registration</h2>
      <p>
        You must provide accurate information when registering. You are responsible for maintaining the
        confidentiality of your login credentials and for all activity under your account. Notify us immediately
        at{' '}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a> if you suspect unauthorized access.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful purposes or to violate applicable laws</li>
        <li>Attempt to gain unauthorized access to our systems or other users&apos; data</li>
        <li>Upload malicious code or interfere with the Service&apos;s operation</li>
        <li>Misrepresent your identity or provide false financial documents</li>
      </ul>

      <h2>5. Payments</h2>
      <p>
        Payments are processed through Razorpay. Test payments (e.g. ₹1 verification) are for integration
        testing only. Future paid plans, if offered, will be priced in Indian Rupees (INR) and disclosed
        before checkout. By completing a payment, you also agree to our{' '}
        <Link href="/refunds">Cancellation &amp; Refunds Policy</Link> and{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The Service, including software, design, and content we provide, remains our property or that of our
        licensors. You retain ownership of data you upload. You grant us a limited license to process your
        data solely to operate and improve the Service.
      </p>

      <h2>7. Disclaimer</h2>
      <p>
        The Service provides financial organization tools and educational content. It does not constitute
        professional tax, legal, or investment advice. AI-generated suggestions are informational only; verify
        important decisions with qualified professionals.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by Indian law, we are not liable for indirect, incidental, or
        consequential damages arising from your use of the Service. Our total liability for any claim shall
        not exceed the amount you paid us in the twelve (12) months preceding the claim, or ₹1,000, whichever
        is greater.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate access if you breach these
        Terms or if required by law. Upon termination, your right to use the Service ends; data handling is
        described in our Privacy Policy.
      </p>

      <h2>10. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of India. Courts in Mumbai, Maharashtra shall have exclusive
        jurisdiction, subject to applicable consumer protection laws. For disputes, contact us first at{' '}
        <Link href="/contact">Contact Us</Link>; we will attempt good-faith resolution within 30 days.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these Terms. Material changes will be posted on {websiteUrl} with an updated effective
        date. Continued use after changes constitutes acceptance.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Refund requests
        are handled per our policy within {refundBusinessDays} business days where applicable.
      </p>
    </>
  );
}

export function PrivacyContent() {
  const { brandName, legalName, supportEmail, proprietorName } = legalConfig;

  return (
    <>
      <h2>1. Who we are</h2>
      <p>
        {legalName} ({brandName}), operated by {proprietorName}, is the data controller for personal information
        collected through the Service.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, phone, password (hashed), profile details you provide
        </li>
        <li>
          <strong>Financial data:</strong> transactions, categories, goals, salary details, bank statement
          files you import, and related metadata
        </li>
        <li>
          <strong>Bank alerts (Android, opt-in):</strong> when you enable Bank alert sync in the mobile
          app, the app may read bank/UPI transaction alerts from the notification shade (Notification
          access). OTP and non-transaction notices are ignored. Structured drafts are uploaded only
          after you confirm (Yes). We do not request SMS inbox permission.
        </li>
        <li>
          <strong>Usage data:</strong> app interactions, device/browser type, IP address, cookies for session
          and preferences
        </li>
        <li>
          <strong>Payment data:</strong> payment identifiers and status from Razorpay; we do not store full card
          numbers
        </li>
        <li>
          <strong>AI processing:</strong> prompts and context sent to third-party AI providers (e.g. Google
          Gemini) when you use advisor features
        </li>
      </ul>

      <h2>3. Why we use your data</h2>
      <ul>
        <li>Provide and secure the Service (authentication, fraud prevention)</li>
        <li>Process transactions, imports, and financial insights you request</li>
        <li>Process payments via Razorpay</li>
        <li>Improve features and fix errors</li>
        <li>Comply with legal obligations</li>
        <li>Send service-related communications (with your consent where required)</li>
      </ul>

      <h2>4. Sharing with third parties</h2>
      <p>We may share data with:</p>
      <ul>
        <li>
          <strong>Razorpay</strong> — payment processing
        </li>
        <li>
          <strong>Cloud hosting</strong> (e.g. Vercel) — application hosting
        </li>
        <li>
          <strong>Database / storage providers</strong> — secure data storage
        </li>
        <li>
          <strong>Google</strong> — OAuth sign-in and AI services, when you use those features
        </li>
        <li>
          <strong>Authorities</strong> — when required by law
        </li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>5. Security</h2>
      <p>
        We use HTTPS, encrypted connections, hashed passwords, and access controls. No method of transmission
        over the Internet is 100% secure; we work to protect your data using industry-standard practices.
      </p>

      <h2>6. Retention</h2>
      <p>
        We retain your data while your account is active and as needed for legal, tax, or dispute purposes.
        You may request deletion subject to applicable law and legitimate business needs.
      </p>

      <h2>7. Your rights</h2>
      <p>Under applicable Indian data protection norms, you may:</p>
      <ul>
        <li>Access and correct your profile data in Settings</li>
        <li>Request a copy or deletion of your data by emailing {supportEmail}</li>
        <li>Withdraw consent for optional marketing or analytics where offered</li>
        <li>Lodge a complaint with our Grievance Officer via <Link href="/contact">Contact Us</Link></li>
      </ul>

      <h2>8. Cookies</h2>
      <p>
        We use essential cookies for authentication and session management. Optional analytics preferences may
        be controlled in Settings where available.
      </p>

      <h2>9. Children</h2>
      <p>The Service is not intended for users under 18 years of age.</p>

      <h2>10. Updates</h2>
      <p>
        We may update this Privacy Policy. The effective date at the top of this page will change when we do.
      </p>

      <h2>11. Contact</h2>
      <p>
        Privacy requests: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </p>
    </>
  );
}

export function ShippingContent() {
  const { brandName, supportEmail, supportPhone, refundBusinessDays } = legalConfig;

  return (
    <>
      <h2>1. Digital service only</h2>
      <p>
        {brandName} is a software service delivered electronically. We do not ship physical goods. This
        Shipping &amp; Service Delivery Policy describes how digital access is provided.
      </p>

      <h2>2. Delivery method</h2>
      <p>Access is delivered by:</p>
      <ul>
        <li>Instant account activation after successful registration</li>
        <li>Web application at our approved domain</li>
        <li>Mobile app access where configured for your account</li>
      </ul>

      <h2>3. Activation timeline</h2>
      <ul>
        <li>
          <strong>Free / registered access:</strong> Typically immediate upon email verification and login
        </li>
        <li>
          <strong>After payment (when paid plans are offered):</strong> Access within 24 hours of successful
          payment confirmation; usually immediate
        </li>
        <li>
          <strong>Support delays:</strong> If access is not available within 24 hours, contact{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a> or {supportPhone}
        </li>
      </ul>

      <h2>4. Geographic availability</h2>
      <p>
        The Service is primarily offered to users in India. Features may vary by region. All prices, when
        displayed, are in INR.
      </p>

      <h2>5. Service availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted access. Scheduled maintenance will be
        communicated where practicable.
      </p>

      <h2>6. No shipping charges</h2>
      <p>As there are no physical products, shipping fees do not apply.</p>

      <h2>7. Related policies</h2>
      <p>
        For cancellations and refunds, see our <Link href="/refunds">Cancellation &amp; Refunds Policy</Link>{' '}
        (refunds processed within {refundBusinessDays} business days where eligible).
      </p>
    </>
  );
}

export function RefundsContent() {
  const { brandName, supportEmail, refundBusinessDays, supportPhone } = legalConfig;

  return (
    <>
      <h2>1. Overview</h2>
      <p>
        This policy explains how cancellations and refunds work for {brandName}, operated by{' '}
        {legalConfig.legalName}.
      </p>

      <h2>2. Test payments</h2>
      <p>
        Integration test payments (e.g. ₹1.00 Razorpay test charges) are non-refundable. They exist solely to
        verify payment connectivity in test mode.
      </p>

      <h2>3. Future paid plans</h2>
      <p>
        When paid subscriptions or one-time purchases are offered, pricing and billing frequency will be shown
        before payment. You may cancel recurring subscriptions from account settings or by emailing{' '}
        {supportEmail}.
      </p>

      <h2>4. Refund eligibility</h2>
      <p>Refunds may be issued when:</p>
      <ul>
        <li>You were charged in error (duplicate charge, wrong amount)</li>
        <li>Paid access was not provisioned within 48 hours of confirmed payment</li>
        <li>A statutory refund right applies under Indian consumer law</li>
      </ul>
      <p>Refunds are generally not provided for:</p>
      <ul>
        <li>Change of mind after substantial use of paid features</li>
        <li>Failure to meet technical requirements on your device</li>
        <li>Violation of our Terms leading to account termination</li>
      </ul>

      <h2>5. How to request a refund</h2>
      <ol>
        <li>
          Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> within 7 days of the charge with your
          registered email, payment date, and Razorpay payment ID
        </li>
        <li>We acknowledge requests within 48 hours</li>
        <li>
          Approved refunds are processed to the original payment method within {refundBusinessDays} business
          days
        </li>
      </ol>

      <h2>6. Cancellation</h2>
      <p>
        You may cancel your account or subscription at any time. Cancellation stops future billing; it does
        not automatically refund prior periods unless eligible above.
      </p>

      <h2>7. Chargebacks</h2>
      <p>
        Contact us at {supportPhone} or {supportEmail} before initiating a bank chargeback so we can resolve
        the issue promptly.
      </p>

      <h2>8. Grievance</h2>
      <p>
        Unresolved complaints: see our <Link href="/contact">Grievance Officer</Link> (acknowledgement within
        48 hours; resolution target within 30 days).
      </p>
    </>
  );
}

export function ContactContent() {
  const { legalName, brandName, supportEmail, supportPhone, supportHours, grievanceOfficer } = legalConfig;
  const address = formatRegisteredAddress();

  return (
    <>
      <div className="not-prose -mt-2 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal entity</p>
          <p className="mt-2 font-medium text-foreground">{legalName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Trading as {brandName} · Individual proprietorship (India)
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
          <a
            href={`mailto:${supportEmail}`}
            className="mt-2 block text-sm font-medium text-primary hover:underline"
          >
            {supportEmail}
          </a>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
          <a
            href={`tel:${supportPhone.replace(/\s/g, '')}`}
            className="mt-2 block text-sm font-medium text-primary hover:underline"
          >
            {supportPhone}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">{supportHours}</p>
        </div>
      </div>

      <h2>Registered / operating address</h2>
      <div className="rounded-lg border border-border/80 bg-muted/30 px-4 py-3">
        <p className="whitespace-pre-line text-foreground">{address}</p>
      </div>
      {!isRegisteredAddressConfigured() && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Set your KYC address via <code className="text-xs">NEXT_PUBLIC_LEGAL_ADDRESS</code> on
          Vercel (see <code className="text-xs">.env.example</code>).
        </p>
      )}

      <h2>Grievance / Nodal Officer</h2>
      <p>In compliance with Indian e-commerce and payment-aggregator guidelines:</p>
      <div className="not-prose rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="font-medium text-foreground">{grievanceOfficer.name}</p>
        <p className="text-sm text-muted-foreground">{grievanceOfficer.designation}</p>
        <div className="mt-3 flex flex-col gap-1 text-sm">
          <a href={`mailto:${grievanceOfficer.email}`} className="text-primary hover:underline">
            {grievanceOfficer.email}
          </a>
          <a
            href={`tel:${grievanceOfficer.phone.replace(/\s/g, '')}`}
            className="text-primary hover:underline"
          >
            {grievanceOfficer.phone}
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Acknowledgement within 48 hours · Resolution target within 30 days
        </p>
      </div>

      <h2>Website</h2>
      <p>
        <a href={legalConfig.websiteUrl}>{legalConfig.websiteUrl}</a>
      </p>
    </>
  );
}
