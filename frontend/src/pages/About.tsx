import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Database, Zap, Search, Server, BarChart3, ArrowRight, Cloud } from 'lucide-react'

interface AboutPageProps {
  onStartDemo?: () => void
}

export default function AboutPage({ onStartDemo }: AboutPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* GPU-optimized orb animations - use translate3d for hardware acceleration */
      @keyframes floatOrb1 {
        0%, 100% {
          transform: translate3d(0, -50%, 0);
          opacity: 0.5;
        }
        50% {
          transform: translate3d(20px, calc(-50% - 15px), 0);
          opacity: 0.65;
        }
      }
      @keyframes floatOrb2 {
        0%, 100% {
          transform: translate3d(0, -50%, 0);
          opacity: 0.5;
        }
        50% {
          transform: translate3d(-20px, calc(-50% + 15px), 0);
          opacity: 0.65;
        }
      }

      /* Subtle pulse with smooth easing */
      @keyframes subtlePulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }

      /* SVG diagram interactions - GPU-optimized */
      #ragDiagram g {
        transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
                    transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
        transform-origin: center;
      }
      #ragDiagram g:hover {
        opacity: 0.9;
        transform: scale(1.01) translateZ(0);
      }
      #ragDiagram #metrics { animation: subtlePulse 3s cubic-bezier(0.76, 0, 0.24, 1) infinite; }
      #ragDiagram #response { animation: subtlePulse 3.5s cubic-bezier(0.76, 0, 0.24, 1) infinite; }
      #ragDiagram #storage { animation: subtlePulse 2.5s cubic-bezier(0.76, 0, 0.24, 1) infinite; }
      #ragDiagram path {
        transition: stroke-width 200ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      #ragDiagram path:hover { stroke-width: 3; }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        @keyframes floatOrb1 { 0%, 100% { transform: translate3d(0, -50%, 0); } }
        @keyframes floatOrb2 { 0%, 100% { transform: translate3d(0, -50%, 0); } }
        #ragDiagram #metrics,
        #ragDiagram #response,
        #ragDiagram #storage { animation: none; }
      }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  return (
    <div className="about-page">
      {/* Business Impact Hero - Leadership Focus */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
        minHeight: '100vh'
      }}>
        {/* Subtle Grid Background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-8 md:py-12">
          {/* Executive Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-8"
          >
            <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 mb-6">
              <span className="text-amber-400 text-sm font-semibold tracking-wide">BUSINESS IMPACT</span>
            </div>
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
              style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
            >
              Turn AI Infrastructure Into
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                Measurable Business Value
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-4xl mx-auto leading-relaxed">
              Strategic infrastructure choices for{' '}
              <span
                className="text-xl md:text-2xl font-bold px-2 py-0.5 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(118, 185, 0, 0.2), rgba(237, 39, 56, 0.2))',
                  color: '#76B900',
                  border: '2px solid rgba(118, 185, 0, 0.4)'
                }}
              >
                RAG Applications
              </span>{' '}
              directly impact your bottom line—
              <span className="text-emerald-400 font-semibold">significantly reducing costs</span> while
              <span className="text-emerald-400 font-semibold">dramatically accelerating time-to-value</span>
            </p>
          </motion.div>

          {/* Three Pillars of Business Value */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid md:grid-cols-3 gap-4 mb-8"
          >
            {/* Cost Reduction */}
            <div className="relative group">
              <div
                className="h-full p-4 rounded-2xl border transition-all duration-300"
                style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  borderColor: 'rgba(16, 185, 129, 0.2)',
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Cost Reduction</h3>
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-emerald-400 mb-1">Dramatically</div>
                    <div className="text-sm md:text-base text-white/60">lower storage costs</div>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-emerald-400 mb-1">Significantly</div>
                    <div className="text-sm md:text-base text-white/60">improved GPU efficiency</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm md:text-base text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>Eliminate expensive cloud egress fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>Reduce GPU idle time with faster I/O</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">✓</span>
                    <span>Lower operational overhead</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Revenue Acceleration */}
            <div className="relative group">
              <div
                className="h-full p-4 rounded-2xl border transition-all duration-300"
                style={{
                  background: 'rgba(251, 191, 36, 0.05)',
                  borderColor: 'rgba(251, 191, 36, 0.2)',
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Revenue Acceleration</h3>
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-amber-400 mb-1">Rapid</div>
                    <div className="text-sm md:text-base text-white/60">time-to-market</div>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-amber-400 mb-1">Enhanced</div>
                    <div className="text-sm md:text-base text-white/60">productivity</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm md:text-base text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✓</span>
                    <span>Launch AI products faster</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✓</span>
                    <span>Improve customer satisfaction with lightning-fast responses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-1">✓</span>
                    <span>Enable real-time AI experiences</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Strategic Advantage */}
            <div className="relative group">
              <div
                className="h-full p-4 rounded-2xl border transition-all duration-300"
                style={{
                  background: 'rgba(237, 39, 56, 0.05)',
                  borderColor: 'rgba(237, 39, 56, 0.2)',
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
                  <Server className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Competitive Advantage</h3>
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-red-400 mb-1">Exceptional</div>
                    <div className="text-sm md:text-base text-white/60">retrieval speed</div>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-red-400 mb-1">Unlimited</div>
                    <div className="text-sm md:text-base text-white/60">scalability</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm md:text-base text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span>Differentiate with superior AI performance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span>Scale without infrastructure constraints</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span>Future-proof AI investments</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The AI Infrastructure Challenge Section - Separate Slide */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
        minHeight: '100vh'
      }}>
        {/* Subtle Grid Background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-16 md:py-24">
          {/* The Challenge & Solution */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
              The AI Infrastructure Challenge
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Traditional Approach */}
              <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/30">
                <h3 className="text-2xl md:text-3xl font-bold text-red-400 mb-6">❌ Traditional Approach</h3>
                <ul className="space-y-4 text-lg md:text-xl text-white/70">
                  <li className="flex items-start gap-3">
                    <Database className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xl font-semibold text-white">Slow Cloud Storage</div>
                      <div className="text-base md:text-lg">200-500ms TTFB creates GPU bottlenecks</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Cloud className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xl font-semibold text-white">High Egress Costs</div>
                      <div className="text-base md:text-lg">$0.09/GB adds up fast at enterprise scale</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Server className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xl font-semibold text-white">GPU Underutilization</div>
                      <div className="text-base md:text-lg">Expensive GPUs wait on slow I/O</div>
                    </div>
                  </li>
                </ul>
              </div>

              {/* DDN + NVIDIA Solution */}
              <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-blue-950/30 border border-emerald-500/30">
                <h3 className="text-2xl md:text-3xl font-bold text-emerald-400 mb-6">✓ DDN + NVIDIA Solution</h3>
                <ul className="space-y-4 text-lg md:text-xl text-white/70">
                  <li className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xl font-semibold text-white">High-Speed INFINIA Storage</div>
                      <div className="text-base md:text-lg">20-50ms TTFB eliminates bottlenecks</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <BarChart3 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xl font-semibold text-white">Predictable Costs</div>
                      <div className="text-base md:text-lg">No egress fees, flat pricing model</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Search className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xl font-semibold text-white">Maximum GPU Efficiency</div>
                      <div className="text-base md:text-lg">Keep expensive compute fully utilized</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* ROI Statement */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center p-12 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20"
          >
            <p className="text-2xl md:text-3xl text-white mb-6 leading-relaxed">
              "The right infrastructure choice today determines whether your AI initiatives
              <span className="text-amber-400 font-bold"> generate revenue</span> or
              <span className="text-red-400 font-bold"> drain budgets</span>"
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span>Proven at enterprise scale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span>Real-world performance data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span>Production-ready architecture</span>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mt-16"
          >
            {onStartDemo && (
              <button
                onClick={onStartDemo}
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-xl text-2xl md:text-3xl font-semibold transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #ED2738 0%, #76B900 100%)',
                  color: 'white',
                  boxShadow: '0 10px 40px rgba(237, 39, 56, 0.3)'
                }}
              >
                <span>See the Performance Difference</span>
                <ArrowRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            <p className="text-white/50 text-lg md:text-xl mt-6">Live demonstration with real-time metrics</p>
          </motion.div>
        </div>
      </section>

      {/* Original Hero Section */}
      <section className="relative overflow-hidden" style={{ background: '#050508' }}>
        {/* Animated Background Orbs - GPU optimized, isolated for scroll performance */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ contain: 'paint layout', willChange: 'auto' }}
        >
          {/* DDN Red Orb - reduced size & blur for 60fps */}
          <div
            className="absolute rounded-full"
            style={{
              width: 'clamp(280px, 45vw, 400px)',
              height: 'clamp(280px, 45vw, 400px)',
              background: 'radial-gradient(circle, rgba(237, 39, 56, 0.3) 0%, rgba(237, 39, 56, 0) 70%)',
              filter: 'blur(50px)',
              left: '-5%',
              top: '50%',
              transform: 'translate3d(0, -50%, 0)',
              animation: 'floatOrb1 10s cubic-bezier(0.76, 0, 0.24, 1) infinite'
            }}
          />
          {/* NVIDIA Green Orb */}
          <div
            className="absolute rounded-full"
            style={{
              width: 'clamp(280px, 45vw, 400px)',
              height: 'clamp(280px, 45vw, 400px)',
              background: 'radial-gradient(circle, rgba(118, 185, 0, 0.3) 0%, rgba(118, 185, 0, 0) 70%)',
              filter: 'blur(50px)',
              right: '-5%',
              top: '50%',
              transform: 'translate3d(0, -50%, 0)',
              animation: 'floatOrb2 10s cubic-bezier(0.76, 0, 0.24, 1) infinite'
            }}
          />
          {/* Grid Overlay - static, no animation needed */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
              maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)'
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-20 md:py-28">
          {/* Logo Cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-6 md:gap-8 mb-12"
          >
            {/* DDN Card - GPU-optimized hover */}
            <div
              className="w-32 h-32 md:w-40 md:h-40 rounded-3xl flex flex-col items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) translateZ(0)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) translateZ(0)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <img src="/ddn-logo-white.svg" alt="DDN" className="h-12 md:h-14 w-auto mb-2" />
              <span className="text-white/60 text-xs font-medium">INFINIA</span>
            </div>

            {/* Plus Sign */}
            <span className="text-white/40 text-3xl md:text-4xl font-light">+</span>

            {/* NVIDIA Card - GPU-optimized hover */}
            <div
              className="w-32 h-32 md:w-40 md:h-40 rounded-3xl flex flex-col items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) translateZ(0)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) translateZ(0)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <img src="/nvidia-icon.svg" alt="NVIDIA" className="h-14 md:h-16 w-auto" />
              <span className="text-white/60 text-xs font-medium mt-2">NVIDIA</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-6"
          >
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2"
              style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}
            >
              Enterprise{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #76B900 0%, #00C280 50%, #ED2738 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                RAG Performance
              </span>
            </h1>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white" style={{ letterSpacing: '-0.03em' }}>
              Showcase
            </h2>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-center text-white/70 text-xl md:text-2xl max-w-3xl mx-auto mb-12"
            style={{ lineHeight: 1.7 }}
          >
            Compare DDN INFINIA vs Traditional Object Storage performance for production RAG applications.
            Powered by NVIDIA NeMo AI pipeline.
          </motion.p>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            <StatCard value="Faster" label="Upload Speed" description="vs Traditional Storage" />
            <StatCard value="Lower" label="Latency" description="Time to First Byte" />
            <StatCard value="Sub-second" label="Response Time" description="End-to-end RAG" />
            <StatCard value="Advanced" label="LLM Models" description="NVIDIA NeMo" />
          </motion.div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="bg-surface-primary px-6 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-10">
            <span className="eyebrow text-nvidia-green">How It Works</span>
            <h2 className="heading-2 mt-2 mb-3">
              RAG Pipeline Architecture
            </h2>
            <p className="body-text max-w-2xl mx-auto">
              End-to-end enterprise RAG pipeline combining DDN INFINIA high-performance storage with NVIDIA NeMo AI acceleration for sub-100ms response times.
            </p>
          </div>

          {/* Architecture Diagram */}
          <div
            ref={containerRef}
            className="rounded-2xl p-6"
            style={{ background: '#201E1E', border: '1px solid #3F3B3C' }}
          >
            <svg width="100%" height="500" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg" id="ragDiagram">
              <defs>
                <linearGradient id="ddnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#E31B23', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#C41E3A', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="nvidiaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#76B900', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#5A9000', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#76B900" />
                </marker>
                <marker id="arrowhead2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                  <polygon points="0 0, 10 3, 0 6" fill="#FFD700" />
                </marker>
              </defs>

              {/* Data Ingestion Stage */}
              <g id="ingestion">
                <rect x="20" y="50" width="140" height="95" rx="8" fill="#2a2a2a" stroke="#76B900" strokeWidth="2" />
                <text x="90" y="78" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">Document</text>
                <text x="90" y="98" textAnchor="middle" fill="#76B900" fontSize="11" fontWeight="bold">Multi-Modal</text>
                <text x="90" y="115" textAnchor="middle" fill="#76B900" fontSize="10">Upload</text>
                <text x="90" y="130" textAnchor="middle" fill="#888888" fontSize="8">PDF / Word / Excel / PPT</text>
              </g>

              <path d="M 160 90 L 190 90" stroke="#76B900" strokeWidth="2" markerEnd="url(#arrowhead)" fill="none" />

              {/* Text Processing with NVIDIA NV-Ingest */}
              <g id="processing">
                <rect x="190" y="50" width="140" height="95" rx="8" fill="#2a2a2a" stroke="#76B900" strokeWidth="2" />
                <text x="260" y="75" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">Extract &amp;</text>
                <rect x="205" y="83" width="110" height="26" rx="4" fill="#76B900" opacity="0.9" />
                <text x="260" y="101" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">NV-Ingest</text>
                <text x="260" y="118" textAnchor="middle" fill="#76B900" fontSize="10">Smart Chunking</text>
                <text x="260" y="133" textAnchor="middle" fill="#888888" fontSize="8">Auto-fallback enabled</text>
              </g>

              <path d="M 330 90 L 360 90" stroke="#76B900" strokeWidth="2" markerEnd="url(#arrowhead)" fill="none" />

              {/* Dual Storage - DDN INFINIA + AWS S3 */}
              <g id="storage">
                <rect x="360" y="20" width="180" height="160" rx="8" fill="url(#ddnGradient)" stroke="#E31B23" strokeWidth="3" filter="url(#glow)" />
                <text x="450" y="45" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">Dual Storage</text>
                <rect x="370" y="55" width="160" height="42" rx="4" fill="#1a1a1a" stroke="#ffffff" strokeWidth="0.5" />
                <text x="450" y="72" textAnchor="middle" fill="#E31B23" fontSize="12" fontWeight="bold">DDN INFINIA</text>
                <text x="450" y="87" textAnchor="middle" fill="#FFD700" fontSize="9">Data Center / Colorado DC</text>
                <text x="450" y="108" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">vs</text>
                <rect x="370" y="115" width="160" height="42" rx="4" fill="#1a1a1a" stroke="#ffffff" strokeWidth="0.5" />
                <text x="450" y="132" textAnchor="middle" fill="#FF9900" fontSize="12" fontWeight="bold">Traditional Storage</text>
                <text x="450" y="147" textAnchor="middle" fill="#FFD700" fontSize="9">Cloud Storage</text>
                <text x="450" y="170" textAnchor="middle" fill="#FFD700" fontSize="10" fontWeight="bold">Performance Tested</text>
              </g>

              <path d="M 450 180 L 450 220" stroke="#E31B23" strokeWidth="2" markerEnd="url(#arrowhead)" fill="none" />

              {/* FAISS Vector Search */}
              <g id="vector">
                <rect x="370" y="220" width="160" height="70" rx="8" fill="#2a2a2a" stroke="#76B900" strokeWidth="2" />
                <text x="450" y="248" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">FAISS</text>
                <text x="450" y="268" textAnchor="middle" fill="#76B900" fontSize="11">Vector Search</text>
                <text x="450" y="282" textAnchor="middle" fill="#888888" fontSize="8">Semantic Retrieval</text>
              </g>

              <path d="M 530 255 L 580 255" stroke="#76B900" strokeWidth="2" markerEnd="url(#arrowhead)" fill="none" />

              {/* NeMo Reranker */}
              <g id="reranker">
                <rect x="580" y="220" width="150" height="70" rx="8" fill="url(#nvidiaGradient)" stroke="#76B900" strokeWidth="2" />
                <text x="655" y="248" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">NeMo Reranker</text>
                <text x="655" y="268" textAnchor="middle" fill="#ffffff" fontSize="10">Score &amp; Reorder</text>
                <text x="655" y="282" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8">Improved Relevance</text>
              </g>

              <path d="M 730 255 L 780 255" stroke="#76B900" strokeWidth="2" markerEnd="url(#arrowhead)" fill="none" />

              {/* NeMo Guardrails */}
              <g id="guardrails">
                <rect x="780" y="220" width="150" height="70" rx="8" fill="#2a2a2a" stroke="#76B900" strokeWidth="2" />
                <text x="855" y="248" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">Guardrails</text>
                <text x="855" y="268" textAnchor="middle" fill="#76B900" fontSize="10">Content Safety</text>
                <text x="855" y="282" textAnchor="middle" fill="#888888" fontSize="8">Input/Output Filter</text>
              </g>

              <path d="M 930 255 L 980 255" stroke="#76B900" strokeWidth="2" markerEnd="url(#arrowhead)" fill="none" />

              {/* LLM Response - Model Agnostic */}
              <g id="response">
                <rect x="980" y="180" width="180" height="150" rx="8" fill="url(#nvidiaGradient)" stroke="#76B900" strokeWidth="3" filter="url(#glow)" />

                {/* Model Agnostic Badge */}
                <rect x="995" y="195" width="150" height="22" rx="4" fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="1.5" />
                <text x="1070" y="210" textAnchor="middle" fill="#FFD700" fontSize="11" fontWeight="bold">🔄 MODEL AGNOSTIC</text>

                {/* Primary Model */}
                <text x="1070" y="235" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">Nemotron 70B</text>

                {/* Additional Models */}
                <text x="1070" y="255" textAnchor="middle" fill="#ffffff" fontSize="11" opacity="0.9">Llama 3.1 • Mixtral</text>
                <text x="1070" y="270" textAnchor="middle" fill="#ffffff" fontSize="10" opacity="0.7">+ More Models</text>

                {/* LLM Response Label */}
                <text x="1070" y="290" textAnchor="middle" fill="#ffffff" fontSize="12">LLM Response</text>

                {/* Performance Badge */}
                <rect x="1010" y="300" width="120" height="20" rx="4" fill="rgba(0,0,0,0.3)" />
                <text x="1070" y="314" textAnchor="middle" fill="#FFD700" fontSize="10" fontWeight="bold">SUB-100MS</text>
              </g>

              {/* User Query Path */}
              <path d="M 90 170 L 90 380 L 450 380 L 450 290" stroke="#FFD700" strokeWidth="2" strokeDasharray="8,4" fill="none" markerEnd="url(#arrowhead2)" />
              <text x="270" y="395" textAnchor="middle" fill="#FFD700" fontSize="10">User Query Flow</text>

              {/* Metrics Box */}
              <g id="metrics">
                <rect x="20" y="190" width="140" height="100" rx="8" fill="#2a2a2a" stroke="#E31B23" strokeWidth="2" />
                <text x="90" y="215" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">Performance</text>
                <text x="90" y="235" textAnchor="middle" fill="#E31B23" fontSize="10">DDN INFINIA</text>
                <text x="90" y="253" textAnchor="middle" fill="#00C280" fontSize="9">Faster Upload Speed</text>
                <text x="90" y="270" textAnchor="middle" fill="#00C280" fontSize="9">Lower Latency</text>
                <text x="90" y="287" textAnchor="middle" fill="#888888" fontSize="8">vs Traditional Storage</text>
              </g>

              {/* Legend */}
              <g id="legend">
                <text x="30" y="440" fill="#E31B23" fontSize="11" fontWeight="bold">DDN INFINIA Storage</text>
                <text x="30" y="458" fill="#76B900" fontSize="11" fontWeight="bold">NVIDIA NeMo AI</text>
                <text x="30" y="476" fill="#FFD700" fontSize="11" fontWeight="bold">--- User Query Path</text>
              </g>
            </svg>
          </div>

          {/* Infrastructure Partners */}
          <div className="mt-12">
            <h3 className="text-lg font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Infrastructure Partners</h3>
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="card p-6 text-center">
                <img src="/supermicro-logo.png" alt="Supermicro" className="h-10 mx-auto mb-4" />
                <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Hardware Platform</div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  X13 AI Servers • High Density Architecture • Enterprise Grade
                </div>
              </div>

              <div className="card p-6 text-center">
                <img src="/nvidia-icon.svg" alt="NVIDIA" className="h-10 mx-auto mb-4" />
                <div className="text-nvidia-green text-xs font-medium uppercase tracking-wide mb-2">AI Acceleration</div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  H100/A100 GPU Arrays • CUDA Ecosystem • NeMo AI Platform
                </div>
              </div>

              <div className="card p-6 text-center">
                <img src="/logo-ddn.svg" alt="DDN" className="h-10 mx-auto mb-4" />
                <div className="text-ddn-red text-xs font-medium uppercase tracking-wide mb-2">Storage & Data Intelligence</div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  INFINIA Data Intelligence • Exascale Performance • Enterprise AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Stages Section */}
      <section className="bg-surface-base px-6 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-10">
            <span className="eyebrow text-ddn-red">Step by Step</span>
            <h2 className="heading-2 mt-2 mb-3">
              Pipeline Stages
            </h2>
            <p className="body-text max-w-2xl mx-auto">
              Four-stage enterprise RAG pipeline from document ingestion to intelligent response generation.
            </p>
          </div>

          {/* Pipeline Flow Visual */}
          <div className="relative mb-8">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-ddn-red via-nvidia-green to-ddn-red opacity-20" style={{ transform: 'translateY(-50%)' }} />

            <div className="grid md:grid-cols-4 gap-6">
              <StorageCard
                number="01"
                title="Document Processing"
                items={[
                  'Multi-modal ingestion (PDF, Word, Excel, PPT)',
                  'NVIDIA NV-Ingest semantic chunking',
                  'Automatic fallback to standard processing',
                  'Content hash deduplication'
                ]}
                color="ddn"
              />
              <StorageCard
                number="02"
                title="Chunk Storage"
                items={[
                  'Parallel storage to both providers',
                  'DDN INFINIA: On-premises Colorado DC',
                  'Traditional Storage: Cloud-based deployment',
                  'Real-time performance comparison'
                ]}
                color="nvidia"
              />
              <StorageCard
                number="03"
                title="Vector Storage"
                items={[
                  'FAISS IndexFlatL2 for fast search',
                  'SentenceTransformer embeddings',
                  'Efficient similarity matching',
                  'Scalable to millions of vectors'
                ]}
                color="blue"
              />
              <StorageCard
                number="04"
                title="RAG Query"
                items={[
                  'NeMo Reranker for improved relevance',
                  'Content safety guardrails',
                  'Nemotron 70B LLM generation',
                  'Sub-100ms response times'
                ]}
                color="nvidia"
              />
            </div>
          </div>

          {/* Data Flow Summary */}
          <div className="p-6 rounded-xl" style={{ background: 'linear-gradient(135deg, var(--neutral-900) 0%, var(--neutral-800) 100%)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-nvidia-green animate-pulse" />
              <span className="text-xl md:text-2xl font-semibold text-nvidia-green">Data Flow Summary</span>
            </div>
            <div className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Multi-modal documents → <strong className="text-nvidia-green">NVIDIA NV-Ingest</strong> semantic chunking → <strong className="text-ddn-red">DDN INFINIA</strong> storage
              <span className="inline-block mx-2 px-3 py-1 bg-ddn-red text-white text-base md:text-lg font-bold rounded">SIGNIFICANTLY FASTER</span>
              → <strong className="text-nvidia-green">NeMo Reranker</strong> + <strong className="text-nvidia-green">Guardrails</strong> → <strong className="text-nvidia-green">Model-Agnostic LLMs</strong> (Nemotron 70B, Llama 3.1, Mixtral)
              <span className="inline-block mx-2 px-3 py-1 bg-nvidia-green text-white text-base md:text-lg font-bold rounded">SUB-SECOND</span>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Metrics Section */}
      <section className="bg-surface-base px-6 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-10">
            <span className="eyebrow text-ddn-red">Benchmarks</span>
            <h2 className="heading-2 mt-2 mb-3">
              What We Measure
            </h2>
            <p className="body-text max-w-xl mx-auto">
              Comprehensive performance metrics comparing DDN INFINIA against Traditional Object Storage across key dimensions.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <MetricCard
              title="Storage Performance"
              color="ddn"
              items={[
                'Upload speed comparison',
                'Throughput measurement',
                'Reliability metrics',
                'Scalability testing'
              ]}
            />
            <MetricCard
              title="Retrieval Performance"
              color="nvidia"
              items={[
                'Time to First Byte (TTFB)',
                'Query response time',
                'Concurrent access',
                'Consistency metrics'
              ]}
            />
            <MetricCard
              title="RAG Pipeline"
              color="blue"
              items={[
                'Document ingestion',
                'Chunk storage',
                'Vector indexing (FAISS)',
                'LLM integration'
              ]}
            />
          </div>

          {/* Supported Providers */}
          <div className="mb-12">
            <h3 className="heading-3 mb-4">Supported Providers</h3>
            <div className="flex gap-3 flex-wrap">
              <ProviderBadge name="DDN INFINIA" color="#ED2738" icon={<Database className="w-4 h-4" />} />
              <ProviderBadge name="Traditional Storage" color="#FF7600" icon={<Cloud className="w-4 h-4" />} />
              <ProviderBadge name="NVIDIA NeMo" color="#76B900" icon={<Zap className="w-4 h-4" />} />
            </div>
          </div>

          {/* Mission Banner */}
          <div className="rounded-xl p-8 text-white" style={{ background: 'linear-gradient(135deg, var(--ddn-red) 0%, var(--ddn-red-hover) 100%)' }}>
            <div className="eyebrow text-white/80 mb-3">Our Mission</div>
            <p className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed">
              Demonstrate that DDN INFINIA delivers superior performance for enterprise RAG applications—the optimal choice for production deployments requiring ultra-low latency and maximum throughput.
            </p>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="bg-surface-primary px-6 py-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-10">
            <span className="eyebrow text-nvidia-green">Under the Hood</span>
            <h2 className="heading-2 mt-2 mb-3">
              Technology Stack
            </h2>
            <p className="body-text max-w-xl mx-auto">
              Production-ready technologies powering enterprise-scale RAG deployments.
            </p>
          </div>

          {/* Technology Stack Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="card p-6">
              <h3 className="heading-3 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-ddn-red" />
                Backend Stack
              </h3>
              <ul className="space-y-3">
                {[
                  { name: 'FastAPI', desc: 'High-performance Python web framework' },
                  { name: 'FAISS', desc: 'Facebook AI Similarity Search for vectors' },
                  { name: 'SentenceTransformers', desc: 'State-of-the-art text embeddings' },
                  { name: 'NVIDIA NeMo', desc: 'Reranking, Guardrails, Nemotron 70B' },
                  { name: 'Boto3', desc: 'AWS SDK for S3-compatible storage' }
                ].map((tech) => (
                  <li key={tech.name} className="flex items-start gap-3 text-base md:text-lg">
                    <span className="w-2 h-2 bg-ddn-red rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-lg md:text-xl" style={{ color: 'var(--text-primary)' }}>{tech.name}</span>
                      <span className="text-base md:text-lg" style={{ color: 'var(--text-muted)' }}> — {tech.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h3 className="heading-3 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-status-info" />
                Frontend Stack
              </h3>
              <ul className="space-y-3">
                {[
                  { name: 'React', desc: 'UI component library' },
                  { name: 'TypeScript', desc: 'Type-safe JavaScript' },
                  { name: 'Tailwind CSS', desc: 'Utility-first styling' },
                  { name: 'Vite', desc: 'Next-generation frontend tooling' },
                  { name: 'TanStack Query', desc: 'Powerful data fetching' }
                ].map((tech) => (
                  <li key={tech.name} className="flex items-start gap-3 text-sm">
                    <span className="w-1.5 h-1.5 bg-status-info rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{tech.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}> — {tech.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-12">
            <h3 className="heading-3 mb-6 text-center">Use Cases</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Enterprise RAG',
                'Real-time Q&A',
                'Multi-cloud Strategy',
                'Cost Optimization',
                'Hybrid Deployments',
                'AI Data Platform',
                'Document Intelligence',
                'Knowledge Management'
              ].map((useCase) => (
                <span
                  key={useCase}
                  className="bg-surface-secondary px-4 py-2 rounded-full text-sm font-medium border transition-colors"
                  style={{
                    color: 'var(--text-secondary)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  {useCase}
                </span>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <FeatureCard
              icon={<Database className="w-6 h-6" />}
              title="Dual Storage"
              description="Simultaneous storage to DDN INFINIA and AWS S3 for fair comparison"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Real-time Metrics"
              description="Live TTFB and throughput measurements during operations"
            />
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="Vector Search"
              description="FAISS-powered semantic search with NVIDIA NeMo reranking"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="ROI Calculator"
              description="Business impact analysis for enterprise-scale deployments"
            />
          </div>

          {/* Disclaimer */}
          <div
            className="text-center text-sm py-4"
            style={{
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            This demo environment is designed to showcase the performance advantages of DDN INFINIA for RAG applications.
            Results may vary based on network conditions, document complexity, and system load.
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20" style={{ background: 'linear-gradient(135deg, var(--ddn-red) 0%, var(--ddn-red-hover) 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-0.02em' }}>
              Ready to See the Difference?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Configure your environment and start benchmarking DDN INFINIA against Traditional Object Storage for your RAG applications.
            </p>
            <button
              onClick={onStartDemo}
              className="inline-flex items-center gap-3 bg-white text-neutral-900 px-8 py-4 rounded-xl font-semibold text-lg"
              style={{
                transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03) translateZ(0)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateZ(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98) translateZ(0)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.03) translateZ(0)'
              }}
            >
              Start the Demo
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <section className="bg-neutral-900 px-6 py-8">
        <div className="max-w-[1280px] mx-auto text-center">
          <p className="text-white/40 text-sm">
            DDN INFINIA RAG Performance Demo
          </p>
        </div>
      </section>
    </div>
  )
}

function StatCard({ value, label, description }: { value: string; label: string; description: string }) {
  return (
    <div
      className="p-5 rounded-2xl text-center"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div
        className="text-2xl md:text-3xl lg:text-4xl font-bold font-mono mb-2"
        style={{
          background: 'linear-gradient(135deg, #76B900, #00C280)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        {value}
      </div>
      <div className="text-white font-medium text-lg md:text-xl">{label}</div>
      <div className="text-white/50 text-base md:text-lg mt-1">{description}</div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="text-ddn-red mb-3">{icon}</div>
      <h4 className="text-xl md:text-2xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      <p className="text-base md:text-lg" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  )
}

function StorageCard({
  number,
  title,
  items,
  color
}: {
  number: string
  title: string
  items: string[]
  color: 'ddn' | 'nvidia' | 'blue'
}) {
  const colors = {
    ddn: { hex: '#ED2738', bg: 'rgba(237, 39, 56, 0.08)' },
    nvidia: { hex: '#76B900', bg: 'rgba(118, 185, 0, 0.08)' },
    blue: { hex: '#1A81AF', bg: 'rgba(26, 129, 175, 0.08)' }
  }

  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-full h-1"
        style={{ backgroundColor: colors[color].hex }}
      />
      <div
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold mb-3"
        style={{ backgroundColor: colors[color].bg, color: colors[color].hex }}
      >
        {number}
      </div>
      <h4 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: colors[color].hex }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}



function MetricCard({
  title,
  color,
  items
}: {
  title: string
  color: 'ddn' | 'nvidia' | 'blue'
  items: string[]
}) {
  const colorClasses = {
    ddn: 'text-ddn-red',
    nvidia: 'text-nvidia-green',
    blue: 'text-status-info'
  }
  const dotColors = {
    ddn: 'bg-ddn-red',
    nvidia: 'bg-nvidia-green',
    blue: 'bg-status-info'
  }
  const borderColors = {
    ddn: 'border-t-ddn-red',
    nvidia: 'border-t-nvidia-green',
    blue: 'border-t-status-info'
  }

  return (
    <div className={`card p-5 border-t-4 ${borderColors[color]}`}>
      <h4 className={`text-lg md:text-xl font-semibold ${colorClasses[color]} uppercase tracking-wide mb-4`}>
        {title}
      </h4>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
            <span className={`w-1.5 h-1.5 ${dotColors[color]} rounded-full mt-2 flex-shrink-0`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProviderBadge({
  name,
  color,
}: {
  name: string
  color: string
  icon?: React.ReactNode
}) {
  return (
    <div
      className="flex items-center gap-2 bg-surface-secondary px-4 py-2.5 rounded-lg transition-colors"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-lg md:text-xl font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
    </div>
  )
}
