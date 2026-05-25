import { Link } from 'react-router';
import Footer from '../components/Footer';
import Logo from '../components/Logo';

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-charcoal-400">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo className="h-9 w-auto" /></Link>
          <Link className="text-sm text-charcoal-400 hover:text-charcoal" to="/">← Back</Link>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-charcoal">Terms of Service</h1>
        <p className="mt-2 text-sm text-charcoal-400">Last updated: May 2026</p>

        <Section title="Acceptance of Terms">
          <p>By creating an account or using StructureMyLearning, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
        </Section>

        <Section title="Account Registration">
          <p>You must provide accurate information when creating an account. You are responsible for keeping your credentials secure and for all activity that occurs under your account.</p>
        </Section>

        <Section title="Free Tier">
          <p>Free accounts include a lifetime limit of three (3) learning guides and access to the AI tutor on those guides subject to a per-guide message cap. These limits exist to ensure service quality for all users. We reserve the right to adjust free-tier limits for new signups with reasonable notice; existing guides created under a free account are not deleted when limits change.</p>
        </Section>

        <Section title="Subscriptions and Billing">
          <p><strong className="text-charcoal">Paid plans.</strong> StructureMyLearning offers monthly and annual Pro subscription plans. Prices are displayed in INR for users in India and USD for all other regions. All prices are inclusive of applicable taxes unless stated otherwise.</p>
          <p><strong className="text-charcoal">Auto-renewal.</strong> Subscriptions renew automatically at the end of each billing period (monthly or annual) at the then-current rate unless you cancel before the renewal date. You authorise us to charge your payment method on file for each renewal.</p>
          <p><strong className="text-charcoal">Cancellation.</strong> You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period — you retain Pro access until that date and will not be charged again. We do not prorate partial periods.</p>
          <p><strong className="text-charcoal">Refunds.</strong> Monthly plan payments are non-refundable. For annual plans, you may request a refund within 7 days of the initial purchase or renewal if you have not generated more than three guides during that period. Refund requests outside this window are considered on a case-by-case basis at our discretion.</p>
          <p><strong className="text-charcoal">Price changes.</strong> We may change subscription prices at any time. We will notify active subscribers at least 30 days before a price increase takes effect. Continued use after the notice period constitutes acceptance of the new price.</p>
          <p><strong className="text-charcoal">Fair use.</strong> Pro plans are marketed as unlimited but are subject to fair-use limits designed to ensure a good experience for all subscribers. We reserve the right to throttle or restrict access for usage that materially exceeds normal personal use. We will notify affected users before taking action where practicable.</p>
        </Section>

        <Section title="Lifetime Access">
          <p>Lifetime deals ("LTD") are offered for a one-time payment during limited promotional windows. An LTD grants permanent Pro-level access to the service, subject to a monthly guide-creation limit disclosed at the time of purchase.</p>
          <p>Lifetime access is tied to the continued operation of StructureMyLearning. It does not guarantee any specific feature set in perpetuity — features may change as the product evolves. LTD purchases are <strong className="text-charcoal">non-refundable</strong> after the promotional window closes. If we permanently discontinue the service, we will provide at least 60 days' notice and pro-rated compensation where feasible.</p>
        </Section>

        <Section title="Acceptable Use">
          <p>You agree not to use StructureMyLearning to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Scrape, crawl, or systematically extract content from the service</li>
            <li>Attempt to reverse-engineer, probe, or compromise our systems</li>
            <li>Submit prompts designed to generate harmful, illegal, or abusive content</li>
            <li>Impersonate another person or entity</li>
          </ul>
        </Section>

        <Section title="AI-Generated Content">
          <p>Learning guides and topic content on StructureMyLearning are generated by AI models. This content is provided for <strong className="text-charcoal">educational and informational purposes only</strong>. It is not professional advice (legal, medical, financial, or otherwise) and may contain inaccuracies.</p>
          <p>We do not guarantee the accuracy, completeness, or fitness for a particular purpose of any AI-generated content. Always verify important information from authoritative sources.</p>
        </Section>

        <Section title="Intellectual Property">
          <p>The prompts and learning goals you submit remain yours. The AI-generated content produced in response is provided to you for personal, non-commercial use.</p>
          <p>The StructureMyLearning name, logo, and interface are our intellectual property and may not be reproduced without permission.</p>
        </Section>

        <Section title="Service Availability">
          <p>We provide the service on an as-available basis and do not guarantee uninterrupted access. We may modify, suspend, or discontinue features at any time, with or without notice.</p>
        </Section>

        <Section title="Termination">
          <p>We reserve the right to suspend or terminate accounts that violate these terms or that engage in behaviour that harms other users or the service.</p>
        </Section>

        <Section title="Limitation of Liability">
          <p>To the fullest extent permitted by law, StructureMyLearning is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
        </Section>

        <Section title="Changes to Terms">
          <p>We may update these terms from time to time. Continued use of the service after changes are posted constitutes your acceptance of the updated terms.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about these terms? <Link className="text-teal-700 hover:underline" to="/contact">Contact us</Link>.</p>
        </Section>
      </div>

      <Footer className="border-t border-charcoal/10" />
    </div>
  );
}
