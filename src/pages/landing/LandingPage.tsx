import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Users, QrCode, DollarSign, Bell, BarChart3,
  Package, Search, XCircle, Clock, Zap, Shield,
  Smartphone, CheckCircle, Star, Quote,
  Menu, X, ChevronRight,
} from 'lucide-react'

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#workflow' },
  { label: 'Testimonials', href: '#testimonials' },
]

function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cvs: HTMLCanvasElement = canvas
    const ctxt: CanvasRenderingContext2D = ctx

    cvs.width = window.innerWidth
    cvs.height = window.innerHeight
    const particles: { x: number; y: number; size: number; speedX: number; speedY: number; opacity: number }[] = []

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
      })
    }

    let animId: number
    function animate() {
      ctxt.clearRect(0, 0, cvs.width, cvs.height)
      for (const p of particles) {
        p.x += p.speedX
        p.y += p.speedY
        if (p.x < 0 || p.x > cvs.width) p.speedX *= -1
        if (p.y < 0 || p.y > cvs.height) p.speedY *= -1
        ctxt.beginPath()
        ctxt.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctxt.fillStyle = `rgba(96, 165, 250, ${p.opacity})`
        ctxt.fill()
      }
      animId = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

function AnimatedCounter({ end, suffix = '', duration = 2 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let startTime: number | null = null
    function step(timestamp: number) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [inView, end, duration])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const features = [
  { icon: Users, title: 'Student Management', desc: 'Track students using form numbers with instant lookup and history.' },
  { icon: QrCode, title: 'QR & Barcode Scanning', desc: 'Use your mobile camera for instant book identification and check-in/out.' },
  { icon: DollarSign, title: 'Automated Fine Tracking', desc: 'System calculates fines automatically based on due dates and return dates.' },
  { icon: Bell, title: 'Email Notifications', desc: 'Notify students regarding overdue books and fine payments via automated emails.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track library performance through visual reports and real-time metrics.' },
  { icon: Package, title: 'Inventory Management', desc: 'Monitor book availability, track stock levels, and manage catalog efficiently.' },
]

const problems = [
  { icon: Search, text: 'Slow Search', color: 'text-danger' },
  { icon: XCircle, text: 'Human Errors', color: 'text-danger' },
  { icon: Clock, text: 'Lost Records', color: 'text-danger' },
  { icon: XCircle, text: 'Time Consuming', color: 'text-danger' },
]

const solutions = [
  { icon: Zap, text: 'Instant Student Lookup', color: 'text-success' },
  { icon: QrCode, text: 'QR-Based Book Tracking', color: 'text-success' },
  { icon: DollarSign, text: 'Automated Fine Management', color: 'text-success' },
  { icon: BarChart3, text: 'Real-Time Analytics', color: 'text-success' },
]

const workflowSteps = [
  { icon: Users, label: 'Identify Student', desc: 'Scan student QR or enter form number' },
  { icon: BookOpen, label: 'Scan Book', desc: 'Scan book barcode with camera' },
  { icon: CheckCircle, label: 'Issue Book', desc: 'System records the transaction' },
  { icon: Bell, label: 'Track Due Date', desc: 'Automatic due date calculation' },
  { icon: Bell, label: 'Notifications', desc: 'Email alerts for overdue books' },
]

const whyChoose = [
  { icon: Zap, title: 'Faster Operations', desc: 'Reduce manual work by 95% with automated scanning and tracking.' },
  { icon: Shield, title: 'Better Tracking', desc: 'Never lose records with real-time database and audit trails.' },
  { icon: Smartphone, title: 'Mobile Friendly', desc: 'Works seamlessly on phones, tablets, and desktops.' },
  { icon: Shield, title: 'Secure', desc: 'Supabase authentication with role-based access control.' },
]

const testimonials = [
  { name: 'Sarah Johnson', role: 'Head Librarian', text: 'This system transformed how we manage our library. The barcode scanning alone saved us hours of manual work.', rating: 5 },
  { name: 'Prof. David Chen', role: 'Faculty Member', text: 'The automated fine tracking and email notifications have been a game-changer for student accountability.', rating: 5 },
  { name: 'Alex Rivera', role: 'Student', text: 'Checking out books is so easy now. Just scan and go. The overdue reminders are really helpful too.', rating: 4 },
]

const stats = [
  { value: 10000, suffix: '+', label: 'Books Managed' },
  { value: 5000, suffix: '+', label: 'Students Tracked' },
  { value: 95, suffix: '%', label: 'Reduction in Manual Work' },
  { value: 80, suffix: '%', label: 'Faster Search Process' },
]

const footerLinks = { Features: ['Dashboard', 'Student Management', 'Book Tracking', 'Reports'], Resources: ['Documentation', 'API', 'Support', 'Blog'], Company: ['About', 'Contact', 'Privacy Policy', 'Terms'] }

function SectionTitle({ label, title }: { label: string; title: string }) {
  return (
    <div className="text-center mb-16">
      <motion.span initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent-light border border-accent/20 mb-4"
      >
        {label}
      </motion.span>
      <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
        className="text-3xl md:text-4xl font-bold text-text-primary"
      >
        {title}
      </motion.h2>
    </div>
  )
}

export function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false)

  return (
    <div className="bg-navy-900 min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-accent flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-text-primary">Smart Library</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <a key={item.label} href={item.href} className="text-sm text-text-secondary hover:text-text-primary transition-colors">{item.label}</a>
              ))}
              <Link to="/login" className="text-sm font-medium text-accent-light hover:text-accent transition-colors">Sign in</Link>
              <Link to="/login" className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors shadow-lg shadow-accent/20">Get Started</Link>
            </div>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-text-muted hover:text-text-primary">
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50 bg-navy-900"
            >
              <div className="px-4 py-4 space-y-3">
                {navItems.map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMobileMenu(false)}
                    className="block text-sm text-text-secondary hover:text-text-primary">{item.label}</a>
                ))}
                <Link to="/login" onClick={() => setMobileMenu(false)}
                  className="block text-sm font-medium text-accent-light">Sign in</Link>
                <Link to="/login" onClick={() => setMobileMenu(false)}
                  className="block text-center px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white">Get Started</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <FloatingParticles />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-accent/5 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/3 rounded-full blur-[200px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent/10 text-accent-light border border-accent/20 mb-6">
              Smart Library Management System
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-text-primary leading-tight max-w-4xl mx-auto"
          >
            Transform Your Library Into a{' '}
            <span className="bg-gradient-to-r from-accent via-purple-accent to-cyan-accent bg-clip-text text-transparent">
              Smart Digital System
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto"
          >
            Manage books, students, fines, and inventory with barcode-powered automation.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/login"
              className="px-8 py-3 text-base font-medium rounded-lg bg-accent text-white hover:bg-accent-dark transition-all duration-200 shadow-lg shadow-accent/25 hover:shadow-accent/40"
            >
              Get Started
            </Link>
            <a href="#features"
              className="px-8 py-3 text-base font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-light transition-all duration-200"
            >
              Request Demo
            </a>
          </motion.div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle label="Why Switch?" title="Still Using Manual Registers?" />
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bg-surface border border-border/50 rounded-2xl p-8"
            >
              <h3 className="text-xl font-semibold text-danger mb-6">Manual Register Problems</h3>
              <div className="space-y-4">
                {problems.map((p) => (
                  <div key={p.text} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-danger-bg flex items-center justify-center"><p.icon className={`h-5 w-5 ${p.color}`} /></div>
                    <span className="text-text-secondary">{p.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="bg-surface border border-accent/20 rounded-2xl p-8 glow-blue"
            >
              <h3 className="text-xl font-semibold text-success mb-6">Digital Solution Benefits</h3>
              <div className="space-y-4">
                {solutions.map((s) => (
                  <div key={s.text} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success-bg flex items-center justify-center"><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                    <span className="text-text-secondary">{s.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-800/50 to-navy-900" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle label="Features" title="Everything You Need to Manage Your Library" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="group bg-surface border border-border/50 rounded-2xl p-6 hover:border-accent/30 hover:glow-blue transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <f.icon className="h-6 w-6 text-accent-light" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle label="How It Works" title="Simple 5-Step Workflow" />
          <div className="relative">
            <div className="hidden lg:block absolute top-16 left-[calc(10%+24px)] right-[calc(10%+24px)] h-0.5 bg-gradient-to-r from-accent via-purple-accent to-cyan-accent" />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {workflowSteps.map((step, i) => (
                <motion.div key={step.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-purple-accent flex items-center justify-center shadow-lg shadow-accent/20 mb-4 relative z-10">
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-accent-light mb-1">Step {i + 1}</span>
                  <h4 className="text-sm font-semibold text-text-primary mb-1">{step.label}</h4>
                  <p className="text-xs text-text-muted">{step.desc}</p>
                  {i < workflowSteps.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute -right-4 top-5 h-5 w-5 text-accent/40" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-purple-accent/5 to-cyan-accent/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent to-purple-accent bg-clip-text text-transparent">
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </div>
                <p className="text-sm text-text-muted mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle label="Why Choose Us" title="Built for Modern Libraries" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChoose.map((w, i) => (
              <motion.div key={w.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-surface border border-border/50 rounded-2xl p-6 text-center hover:border-accent/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-accent/20 flex items-center justify-center mx-auto mb-4">
                  <w.icon className="h-6 w-6 text-accent-light" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{w.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle label="Testimonials" title="What People Say" />
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-surface border border-border/50 rounded-2xl p-6"
              >
                <Quote className="h-8 w-8 text-accent/20 mb-4" />
                <p className="text-sm text-text-secondary leading-relaxed mb-4">{t.text}</p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <FloatingParticles />
        <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-purple-accent/10 to-cyan-accent/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-text-primary"
          >
            Ready to Modernize Your Library?
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-text-secondary max-w-xl mx-auto"
          >
            Join thousands of institutions already using Smart Library Management.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/login"
              className="px-8 py-3 text-base font-medium rounded-lg bg-accent text-white hover:bg-accent-dark transition-all duration-200 shadow-lg shadow-accent/25"
            >
              Start Free
            </Link>
            <a href="#features"
              className="px-8 py-3 text-base font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-light transition-all duration-200"
            >
              Contact Us
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-accent flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-text-primary">Smart Library</span>
              </div>
              <p className="text-sm text-text-muted">Modern library management powered by automation.</p>
            </div>
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-text-primary mb-4">{title}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link}><a href="#" className="text-sm text-text-muted hover:text-text-secondary transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted">&copy; 2026 Smart Library. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {['Twitter', 'GitHub', 'LinkedIn'].map((s) => (
                <a key={s} href="#" className="text-text-muted hover:text-text-secondary text-xs transition-colors">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
