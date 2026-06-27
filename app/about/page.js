'use client';

import Image from 'next/image';
import Link from 'next/link';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import { MarketingSection } from '@/components/marketing/layout/MarketingSection';
import { MARKETING_CONTAINER } from '@/lib/utils/marketingLayout';
import Hero from '@/components/marketing/sections/Hero';
import StatsBar from '@/components/marketing/sections/StatsBar';
import { MARKETING_HONEST_STATS } from '@/lib/marketing/homeVisualThemes';
import CTASection from '@/components/marketing/sections/CTASection';
import AboutVoicesSection from '@/components/marketing/sections/AboutVoicesSection';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  Globe, 
  Award, 
  Heart, 
  Zap, 
  Linkedin, 
  Twitter, 
  Mail,
  MapPin,
  Calendar,
  Rocket,
  Target,
  TrendingUp,
  Shield,
  Code,
  Cpu,
  Database,
  LineChart
} from 'lucide-react';

// Company Timeline Data
const timeline = [
  {
    year: '2023',
    title: 'The Spark',
    description: 'Zeeshan Keerio identifies a critical gap in Pakistani business software while working as a Big Data Administrator. Most ERP systems are built for Western markets and fail to address local needs like FBR compliance and Urdu language support.',
    icon: Rocket
  },
  {
    year: '2024',
    title: 'MVP Launch',
    description: 'TENVO launches with core inventory management and Excel import functionality. First 100 businesses onboarded from textile and retail sectors in Lahore and Karachi.',
    icon: Target
  },
  {
    year: '2025',
    title: 'Rapid Growth',
    description:
      'Platform roadmap accelerates: GST-aware tax tools, branded storefronts, and POS depth ship to production. Daraz and live FBR IRIS connectors remain on the roadmap per our integrations map.',
    icon: TrendingUp
  },
  {
    year: '2026',
    title: 'Enterprise Ready',
    description:
      'AI-assisted demand forecasting, manufacturing module (BOM), and multi-business governance expand on Business+. We publish honest capability status instead of vanity certification claims.',
    icon: Shield
  }
];

// Leadership Team Data
const leadershipTeam = [
  {
    name: 'Zeeshan Keerio',
    role: 'Founder, CEO & Lead AI Engineer',
    image: '/zeeshan_keerio.png',
    bio: 'Architects and ships Mindscape Analytics and TENVO end to end: product vision, systems design, full-stack development, and production deployment.',
    expertise: [
      'AI & agentic systems',
      'Enterprise architecture',
      'Full-stack delivery',
      'Cloud & data platforms',
      'Security & compliance posture',
    ],
    social: {
      linkedin: 'https://www.linkedin.com/in/zeeshan-keerio',
      twitter: '#',
      email: 'zeeshan@tenvo.com'
    }
  }
];

// Certifications Data
const certifications = [
  { name: 'GST tax configuration', status: 'Available', icon: Shield },
  { name: 'PSEB Registered', status: 'Active', icon: Award },
  { name: 'ISO 27001', status: 'Planned', icon: Shield },
  { name: 'PCI via partners', status: 'Partial', icon: Shield }
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <Hero 
        variant="centered"
        badge="About TENVO"
        title={
          <>
            Building the Future of <br />
            <span className="text-brand-primary">Pakistani Enterprise Software</span>
          </>
        }
        subtitle="We're on a mission to make enterprise-grade business management accessible to every Pakistani business, from Karachi startups to Lahore manufacturers."
        primaryCTA={{
          text: 'Join Our Team',
          href: '#careers'
        }}
        secondaryCTA={{
          text: 'Contact Us',
          href: '/contact'
        }}
      />

      {/* Stats */}
      <StatsBar 
        variant="default"
        stats={MARKETING_HONEST_STATS}
      />

      {/* Mission & Vision */}
      <MarketingSection className="bg-white" padding="loose">
          <div className="grid gap-8 md:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-primary sm:mb-4 sm:text-[11px] sm:tracking-[0.3em]">Our Mission</h2>
              <h3 className="mb-4 text-2xl font-semibold text-gray-900 sm:mb-6 sm:text-3xl lg:text-4xl">Empowering Pakistani Businesses</h3>
              <p className="mb-4 text-base font-medium leading-relaxed text-gray-500 sm:mb-6 sm:text-lg">
                We believe every business deserves access to world-class enterprise software. TENVO was built from the ground up to address the unique challenges of Pakistani businesses - from FBR compliance to multi-currency operations.
              </p>
              <p className="text-lg text-gray-500 font-medium leading-relaxed">
                Our mission is to level the playing field, giving small and medium businesses the same powerful tools that large enterprises use, at a fraction of the cost.
              </p>
            </div>
            <div>
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-primary sm:mb-4 sm:text-[11px] sm:tracking-[0.3em]">Our Vision</h2>
              <h3 className="mb-4 text-2xl font-semibold text-gray-900 sm:mb-6 sm:text-3xl lg:text-4xl">The Operating System for Business</h3>
              <p className="mb-4 text-base font-medium leading-relaxed text-gray-500 sm:mb-6 sm:text-lg">
                We envision a future where every business in Pakistan runs on TENVO - a unified platform that connects inventory, finance, operations, and compliance into one seamless experience.
              </p>
              <p className="text-base font-medium leading-relaxed text-gray-500 sm:text-lg">
                By 2030, we aim to be the backbone of Pakistan&apos;s digital economy, powering millions of businesses and creating thousands of jobs.
              </p>
            </div>
          </div>
      </MarketingSection>

      {/* Values */}
      <section className="py-10 sm:py-16 lg:py-24 bg-gray-50">
        <div className={MARKETING_CONTAINER}>
          <div className="mx-auto mb-8 max-w-3xl space-y-3 text-center sm:mb-12 lg:mb-16 sm:space-y-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-primary sm:text-[11px] sm:tracking-[0.3em]">Our Values</h2>
            <h3 className="text-2xl font-semibold tracking-tighter text-gray-900 sm:text-3xl md:text-4xl lg:text-5xl">What Drives Us</h3>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 sm:gap-6 md:gap-8">
            <ValueCard
              icon={<Heart className="w-8 h-8" />}
              title="Customer First"
              description="Every decision we make starts with our customers. Their success is our success."
            />
            <ValueCard
              icon={<Zap className="w-8 h-8" />}
              title="Innovation"
              description="We constantly push boundaries to deliver cutting-edge solutions that solve real problems."
            />
            <ValueCard
              icon={<Users className="w-8 h-8" />}
              title="Collaboration"
              description="We believe in the power of teamwork and building strong partnerships with our customers."
            />
            <ValueCard
              icon={<Award className="w-8 h-8" />}
              title="Excellence"
              description="We set high standards and never compromise on quality, security, or reliability."
            />
            <ValueCard
              icon={<Globe className="w-8 h-8" />}
              title="Accessibility"
              description="Enterprise software should be accessible to everyone, not just large corporations."
            />
            <ValueCard
              icon={<Building2 className="w-8 h-8" />}
              title="Local focus"
              description="Pakistan-first launch depth where compliance and payments matter most, with a global product roadmap from Mindscape Analytics LLC."
            />
          </div>
        </div>
      </section>

      {/* Company Timeline */}
      <section className="py-10 sm:py-16 lg:py-24 bg-gray-50">
        <div className={MARKETING_CONTAINER}>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-semibold text-brand-primary uppercase tracking-[0.3em]">Our Journey</h2>
            <h3 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tighter">From Idea to Impact</h3>
            <p className="text-lg text-gray-500 font-medium">
              The story of how TENVO sharpened operations software for Pakistan and scales with teams worldwide.
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-brand-primary/20" />
            
            <div className="space-y-12">
              {timeline.map((item, idx) => (
                <div key={idx} className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`flex-1 ${idx % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className={`bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all ${idx % 2 === 0 ? 'md:ml-auto' : 'md:mr-auto'} max-w-md`}>
                      <div className={`inline-flex items-center gap-2 text-brand-primary mb-3 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                        <item.icon className="w-5 h-5" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{item.year}</span>
                      </div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h4>
                      <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                  <div className="relative z-10 w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section id="team" className="py-10 sm:py-16 lg:py-24 bg-white">
        <div className={MARKETING_CONTAINER}>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-semibold text-brand-primary uppercase tracking-[0.3em]">Leadership</h2>
            <h3 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tighter">Meet the Founder</h3>
            <p className="text-lg text-gray-500 font-medium">
              One founding technical leader behind TENVO and the Mindscape Analytics portfolio: architecture, AI, and delivery in one thread.
            </p>
          </div>

          {/* Zeeshan Keerio Featured Profile */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 sm:p-8 lg:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="grid lg:grid-cols-12 gap-8 items-center relative z-10">
                {/* Profile Image */}
                <div className="lg:col-span-4">
                  <div className="relative mx-auto h-60 w-48 sm:mx-0 sm:h-80 sm:w-64">
                    <div className="absolute inset-0 bg-brand-primary/10 rounded-2xl transform rotate-3" />
                    <Image
                      src="/zeeshan_keerio.png"
                      alt="Zeeshan Keerio - Founder, CEO, and Lead AI Engineer of TENVO"
                      fill
                      className="object-contain rounded-2xl relative z-10"
                    />
                  </div>
                </div>

                {/* Profile Content */}
                <div className="lg:col-span-8 space-y-6">
                  <div>
                    <h3 className="text-3xl font-semibold text-gray-900">Zeeshan Keerio</h3>
                    <p className="text-brand-primary font-bold text-lg">
                      Founder, CEO &amp; Lead AI Engineer
                    </p>
                    <p className="text-sm font-semibold text-gray-500">
                      Principal architect · Mindscape Analytics LLC &amp; TENVO
                    </p>
                  </div>

                  <p className="text-gray-600 font-medium leading-relaxed">
                    Zeeshan leads TENVO and Mindscape Analytics LLC as founder and chief executive, with hands-on ownership as lead AI engineer and systems architect. He originates the product direction, designs the platform architecture, and carries builds from first commit through production deployment - including the applications and initiatives across the Mindscape portfolio.
                  </p>

                  <p className="text-gray-600 font-medium leading-relaxed">
                    That depth of end-to-end delivery informs how TENVO is engineered: locally aware where Pakistan-first tax, language, and payments matter, and structured to scale globally without losing operational rigor. Earlier roles in big data administration and financial analytics sharpened a bias for secure, observable systems at enterprise scale.
                  </p>

                  {/* Expertise Tags */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      'AI & agentic systems',
                      'Enterprise architecture',
                      'Full-stack delivery',
                      'Cloud & DevOps',
                      'Data & security',
                      'Product strategy',
                    ].map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-primary text-xs font-bold rounded-full border border-brand-100">
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Social Links */}
                  <div className="flex items-center gap-4 pt-4">
                    <Link 
                      href="https://www.linkedin.com/in/zeeshan-keerio" 
                      target="_blank"
                      className="w-10 h-10 bg-gray-100 hover:bg-brand-primary hover:text-white rounded-full flex items-center justify-center transition-all"
                    >
                      <Linkedin className="w-5 h-5" />
                    </Link>
                    <Link 
                      href="https://www.mindscapeanalytics.com/zeeshan-keerio" 
                      target="_blank"
                      className="w-10 h-10 bg-gray-100 hover:bg-brand-primary hover:text-white rounded-full flex items-center justify-center transition-all"
                    >
                      <Globe className="w-5 h-5" />
                    </Link>
                    <Link 
                      href="mailto:zeeshan@tenvo.com"
                      className="w-10 h-10 bg-gray-100 hover:bg-brand-primary hover:text-white rounded-full flex items-center justify-center transition-all"
                    >
                      <Mail className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notable Projects */}
          <div className="mt-16">
            <h4 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">Other Ventures & Projects</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Mindscape Analytics LLC', desc: 'Parent company; founder-led architecture, AI, and full product delivery', icon: Cpu },
                { name: 'CyberTraderX', desc: 'Autonomous trading bots using ML', icon: LineChart },
                { name: 'AgriChain', desc: 'Agricultural supply chain DLT', icon: Database },
                { name: 'DBLynx Intelligence', desc: 'Agentic AI data platform', icon: Code }
              ].map((project, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:border-brand-primary/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-primary mb-3 group-hover:bg-brand-primary group-hover:text-white transition-all">
                    <project.icon className="w-5 h-5" />
                  </div>
                  <h5 className="font-bold text-gray-900 mb-1">{project.name}</h5>
                  <p className="text-xs text-gray-500 font-medium">{project.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AboutVoicesSection />

      {/* Certifications & Compliance */}
      <section className="py-10 sm:py-16 lg:py-24 bg-gray-50">
        <div className={MARKETING_CONTAINER}>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-[11px] font-semibold text-brand-primary uppercase tracking-[0.3em]">Certifications</h2>
            <h3 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tighter">Trusted & Verified</h3>
            <p className="text-lg text-gray-500 font-medium">
              We maintain the highest standards of security, compliance, and data protection.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:border-brand-primary/30 hover:shadow-md transition-all group">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-primary group-hover:text-white transition-all text-brand-primary">
                  <cert.icon className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{cert.name}</h4>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                  cert.status === 'Active' || cert.status === 'Available' || cert.status === 'Partial'
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {cert.status}
                </span>
              </div>
            ))}
          </div>

          {/* Karachi Office */}
          <div className="mt-16 bg-white border border-gray-200 rounded-3xl p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-brand-primary">
                  <MapPin className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Headquarters</span>
                </div>
                <h4 className="text-2xl font-semibold text-gray-900">Karachi, Pakistan</h4>
                <p className="text-gray-600 font-medium leading-relaxed">
                  Our main office is located in the heart of Karachi&apos;s tech district. We&apos;re a remote-first company with team members across Pakistan, but our Karachi hub serves as the center for product development and customer success.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">50+ Team Members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Globe className="w-4 h-4" />
                    <span className="font-semibold">Remote-First Culture</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-brand-50 to-gray-100 rounded-2xl p-8 h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-brand-primary mx-auto mb-4" />
                  <p className="font-bold text-gray-900">TENVO Headquarters</p>
                  <p className="text-sm text-gray-500 mt-1">Karachi, Sindh, Pakistan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Careers CTA */}
      <section id="careers" className="py-10 sm:py-16 lg:py-24 bg-white">
        <div className={MARKETING_CONTAINER}>
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <h2 className="text-[11px] font-semibold text-brand-primary uppercase tracking-[0.3em]">Join Our Team</h2>
            <h3 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tighter">Build the Future with Us</h3>
            <p className="text-lg text-gray-500 font-medium">
              We&apos;re always looking for talented individuals who share our passion for empowering Pakistani businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:bg-brand-50 transition-all">
              <div className="text-4xl font-semibold text-brand-primary mb-2">50+</div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Team Members</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:bg-brand-50 transition-all">
              <div className="text-4xl font-semibold text-brand-primary mb-2">Remote</div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Work Culture</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 text-center hover:bg-brand-50 transition-all">
              <div className="text-4xl font-semibold text-brand-primary mb-2">Growing</div>
              <div className="text-sm font-bold text-gray-500 uppercase tracking-wider">Always Hiring</div>
            </div>
          </div>

          <div className="text-center">
            <Button asChild size="lg" className="h-14 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white px-8 font-semibold uppercase tracking-wider">
              <Link href="/contact">View Open Positions</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection 
        variant="centered"
        title="Ready to Transform Your Business?"
        subtitle="Join growing teams using TENVO to streamline their operations."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/register'
        }}
        secondaryCTA={{
          text: 'Contact Sales',
          href: '/contact'
        }}
      />
    </MarketingLayout>
  );
}

function ValueCard({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:shadow-lg sm:p-6 lg:p-8">
      <div className="text-brand-primary mb-4">{icon}</div>
      <h4 className="text-xl font-semibold text-gray-900 mb-3">{title}</h4>
      <p className="text-gray-500 font-medium leading-relaxed">{description}</p>
    </div>
  );
}
