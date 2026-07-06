import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import SectionTitle from '../components/SectionTitle';

const stats = [
  { label: 'Resume tailorings', value: '12k+' },
  { label: 'Interview wins', value: '4.8/5' },
  { label: 'Average time saved', value: '8 hrs' },
];

const features = [
  {
    title: 'AI Resume Tailoring',
    description: 'Match every application with a tailored story that highlights the right strengths.',
  },
  {
    title: 'ATS Readiness',
    description: 'Surface keyword gaps and structure issues before your application reaches the recruiter.',
  },
  {
    title: 'Application Copilot',
    description: 'Generate follow-ups, cover letters, and outreach messages in one flow.',
  },
];

const steps = [
  'Upload your resume and career highlights.',
  'Choose the role and goals you want to target.',
  'Export tailored documents and send your best application.',
];

const testimonials = [
  {
    quote: 'The tailoring workflow gave my applications a sharper story and helped me land interviews faster.',
    name: 'Mina L.',
    role: 'Product Designer',
  },
  {
    quote: 'I finally had a system for resume optimization, cover letters, and follow-up emails without extra effort.',
    name: 'Daniel R.',
    role: 'Operations Lead',
  },
];

const pricing = [
  {
    name: 'Starter',
    price: '$19',
    description: 'Perfect for building a stronger job search system.',
    features: ['2 tailored resumes', 'ATS feedback', 'Email drafts'],
    cta: 'Start free',
    href: '/register',
  },
  {
    name: 'Pro',
    price: '$49',
    description: 'Best for serious applicants managing multiple roles.',
    features: ['Unlimited tailoring', 'Cover letters', 'Priority support'],
    cta: 'Go Pro',
    href: '/register',
  },
];

const faqs = [
  {
    question: 'Do I need to upload my resume to get started?',
    answer: 'You can begin with a resume upload, but the workspace also supports building from scratch.',
  },
  {
    question: 'Is the experience suitable for entry-level applicants?',
    answer: 'Yes. The workflow is designed to support early-career professionals and experienced candidates alike.',
  },
  {
    question: 'Can I use it for multiple jobs?',
    answer: 'Absolutely. Tailor your materials for each role without losing your core profile.',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/80 px-6 py-12 shadow-2xl shadow-black/20 sm:px-8 lg:px-12 lg:py-20">
        <AnimatedBackground />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
            <div className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-300">
              AI-powered career acceleration
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Turn every application into your strongest story.
              </h1>
              <p className="max-w-2xl text-lg text-slate-400">
                Build a sharper resume, optimize for ATS, and send tailored outreach without the usual busywork.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/resume" className="rounded-full bg-cyan-500 px-5 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-400">
                Upload Resume
              </Link>
              <Link to="/jobs" className="rounded-full border border-slate-700 px-5 py-3 text-center font-semibold text-slate-100 transition hover:bg-slate-800">
                Find Jobs
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              <span>✓ No fake jobs</span>
              <span>✓ Original workflows</span>
              <span>✓ Built for modern applicants</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl shadow-black/30">
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">This week</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-sm text-slate-400">Tailored Resume Score</p>
                  <p className="mt-2 text-3xl font-semibold text-white">92/100</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div>
                    <p className="text-sm text-slate-400">Ready for review</p>
                    <p className="text-lg font-semibold text-white">3 tailored applications</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">On track</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-6 sm:grid-cols-3 sm:p-8">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
            <p className="text-3xl font-semibold text-white">{item.value}</p>
            <p className="mt-2 text-sm text-slate-400">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-8 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <SectionTitle eyebrow="Features" title="Everything you need to apply with confidence" description="A focused workspace designed to help you strengthen your story and move faster." />
        <div className="grid gap-4 lg:grid-cols-3">
          {features.map((feature) => (
            <motion.article key={feature.title} whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="space-y-8 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <SectionTitle eyebrow="How it works" title="A simple path from upload to opportunity" description="Move through each step with clarity and keep your momentum intact." />
        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">0{index + 1}</div>
              <p className="text-base text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <SectionTitle eyebrow="Testimonials" title="Trusted by applicants building a stronger search" description="Real momentum from people refining their story and managing applications more intentionally." />
        <div className="grid gap-4 lg:grid-cols-2">
          {testimonials.map((item) => (
            <div key={item.name} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-slate-300">“{item.quote}”</p>
              <div className="mt-4">
                <p className="font-semibold text-white">{item.name}</p>
                <p className="text-sm text-slate-400">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <SectionTitle eyebrow="Pricing" title="Flexible options for every stage" description="Start simple and upgrade when your workflow grows." />
        <div className="grid gap-4 lg:grid-cols-2">
          {pricing.map((plan) => (
            <div key={plan.name} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <p className="text-3xl font-semibold text-cyan-300">{plan.price}</p>
              </div>
              <p className="mt-3 text-sm text-slate-400">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2"><span className="text-cyan-300">•</span>{feature}</li>
                ))}
              </ul>
              <Link to={plan.href} className="mt-6 inline-flex rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400">
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
        <SectionTitle eyebrow="FAQ" title="Questions applicants usually ask" description="A quick overview of how the experience fits into your workflow." />
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <summary className="cursor-pointer font-medium text-white">{faq.question}</summary>
              <p className="mt-3 text-sm leading-7 text-slate-400">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 px-6 py-8 text-sm text-slate-400 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-white">AI Resume Maker</p>
            <p>Original career tools for ambitious applicants.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/resume" className="transition hover:text-cyan-300">Resume</Link>
            <Link to="/jobs" className="transition hover:text-cyan-300">Jobs</Link>
            <Link to="/settings" className="transition hover:text-cyan-300">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
