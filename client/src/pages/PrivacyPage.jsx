import { Link } from 'react-router';
import Footer from '../components/Footer';

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-charcoal-400">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">StructureMyLearning</p>
          <Link className="text-sm text-charcoal-400 hover:text-charcoal" to="/">← Back</Link>
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-charcoal">Privacy Policy</h1>
        <p className="mt-2 text-sm text-charcoal-400">Last updated: May 2026</p>

        <Section title="Information We Collect">
          <p>When you create an account, we collect your name, email address, and — if you sign in via Google or GitHub — your profile information from that provider. During onboarding we ask where you heard about us; this is stored alongside your account.</p>
          <p>We store every learning guide you create, the AI-generated content for each topic, your completion progress, and any contact form messages you send us.</p>
          <p>We collect standard server logs (IP address, browser type, pages visited) for security and debugging purposes.</p>
        </Section>

        <Section title="How We Use It">
          <p>Your information is used solely to provide StructureMyLearning: authenticating you, generating and storing your guides, tracking your progress, and responding to your messages.</p>
          <p>We do not sell your data or use it for advertising. Aggregate, anonymised usage patterns may be used to improve the product.</p>
        </Section>

        <Section title="Third-Party Services">
          <p>We rely on the following services to operate:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-charcoal">Google / GitHub OAuth</strong> — for social sign-in. Their privacy policies apply to the authentication flow.</li>
            <li><strong className="text-charcoal">OpenAI</strong> — your guide prompt and topic titles are sent to OpenAI's API to generate educational content.</li>
            <li><strong className="text-charcoal">fal.ai</strong> — used to generate topic illustrations from text descriptions.</li>
            <li><strong className="text-charcoal">Backblaze B2</strong> — generated images are stored in B2 and delivered via CDN.</li>
            <li><strong className="text-charcoal">Resend</strong> — used to send transactional emails (e.g. contact form confirmations).</li>
            <li><strong className="text-charcoal">Railway</strong> — our database and infrastructure host.</li>
          </ul>
        </Section>

        <Section title="Cookies & Sessions">
          <p>We set a single <code className="rounded bg-charcoal/5 px-1 font-mono text-xs">refreshToken</code> cookie (httpOnly, Secure in production) to keep you signed in across browser sessions. Your access token is held in memory only — it is never written to localStorage or sessionStorage.</p>
          <p>We do not use advertising cookies or third-party tracking pixels.</p>
        </Section>

        <Section title="Data Retention">
          <p>Your data is retained for as long as your account is active. If you wish to delete your account and all associated data, please <Link className="text-teal-700 hover:underline" to="/contact">contact us</Link>.</p>
        </Section>

        <Section title="Your Rights">
          <p>You may request access to, correction of, or deletion of your personal data at any time. To exercise these rights, <Link className="text-teal-700 hover:underline" to="/contact">get in touch</Link>.</p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy? <Link className="text-teal-700 hover:underline" to="/contact">Contact us</Link>.</p>
        </Section>
      </div>

      <Footer className="border-t border-charcoal/10" />
    </div>
  );
}
