import React from "react";

export default function CreativeControlRoom() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 text-gray-900">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(30,58,138,0.08), rgba(6,182,212,0.08) 40%, rgba(59,130,246,0.08))", animation: "panGradient 22s ease-in-out infinite" }} />
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(30,58,138,0.03) 0px, rgba(30,58,138,0.03) 1px, transparent 1px, transparent 3px)" }} />
        <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)" }} />
        <div className="pointer-events-none absolute top-1/2 right-1/4 h-80 w-80 rounded-full blur-3xl opacity-35" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.20), transparent 70%)" }} />
        <div className="pointer-events-none">
          <span className="absolute left-[10%] top-[20%] text-2xl opacity-30" style={{ animation: "floatSoft 7s ease-in-out infinite" }}>✨</span>
          <span className="absolute right-[15%] top-[30%] text-2xl opacity-30" style={{ animation: "floatSoft 8s ease-in-out infinite 1s" }}>🎬</span>
          <span className="absolute left-[12%] bottom-[25%] text-xl opacity-30" style={{ animation: "floatSoft 6.5s ease-in-out infinite .5s" }}>📁</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-900/5 px-3 py-1 text-[12px] text-gray-700 ring-1 ring-gray-900/10 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              Stay Connected
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Your Creative Control Room
            </h2>
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-xl">
              Track every milestone, chat with your producer, and watch your story come to life in real time. Our integrated dashboard brings together all the tools you need for seamless collaboration.
            </p>

            <div className="space-y-4 pt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 ring-2 ring-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Real-time Collaboration</h4>
                  <p className="text-sm text-gray-600">Direct chat with your creative team, instant feedback loops, and version comments.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 ring-2 ring-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Live Progress Tracking</h4>
                  <p className="text-sm text-gray-600">Visual milestones, automated notifications, and transparent timeline updates.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Asset Management</h4>
                  <p className="text-sm text-gray-600">Instant downloads, organized file versions, and multi-format exports ready for every platform.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative" style={{ animation: 'dashboardFadeIn .8s cubic-bezier(.4,0,.2,1) forwards' }}>
            <div className="relative rounded-2xl sm:rounded-3xl bg-slate-800/60 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl overflow-hidden text-white">
              <div className="p-6 sm:p-8 border-b border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-semibold mb-2">Explainer Video — Series A Launch</h3>
                    <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-300 ring-1 ring-cyan-500/30 status-badge-glow">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Status: In Review
                    </div>
                  </div>
                  <div className="hidden sm:block h-16 w-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 ring-2 ring-white/10 flex-shrink-0 overflow-hidden">
                    <div className="h-full w-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/90"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/70">Progress</span>
                    <span className="text-sm font-semibold text-white/90">70%</span>
                  </div>
                  <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="dashboard-progress-bar absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 via-cyan-500 to-teal-500" />
                  </div>
                  <div className="flex items-center justify-between mt-4 relative">
                    {[
                      { label: 'Script', color: 'from-orange-500 to-orange-600' },
                      { label: 'Storyboard', color: 'from-cyan-500 to-cyan-600' },
                      { label: 'Animation', color: 'from-teal-500 to-teal-600', pulse: true },
                      { label: 'Delivery', color: 'from-slate-700/50 to-slate-700/50', hollow: true },
                    ].map((m) => (
                      <div key={m.label} className="milestone flex flex-col items-center gap-2 relative group cursor-pointer">
                        <div className={`h-8 w-8 rounded-full ${m.hollow ? 'bg-slate-700/50 ring-2 ring-slate-600/30' : `bg-gradient-to-br ${m.color} ring-2 ring-white/10`} flex items-center justify-center`}>
                          {m.pulse ? <div className="h-2 w-2 rounded-full bg-white animate-pulse" /> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${m.hollow ? 'text-white/40' : 'text-white'}`}><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <span className={`text-[10px] sm:text-xs ${m.hollow ? 'text-white/40' : 'text-white/60'} font-medium`}>{m.label}</span>
                        <div className="milestone-tooltip">{m.hollow ? 'Coming soon' : (m.pulse ? 'In progress' : `${m.label} completed`)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-slate-900/40">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Project Chat
                  </h4>
                  <span className="text-xs text-white/50">Today</span>
                </div>

                <div className="space-y-4">
                  <div className="chat-bubble-1 flex items-start gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 ring-2 ring-violet-500/30 flex items-center justify-center text-white font-semibold text-sm">S</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">Sarah (PM)</span>
                        <span className="text-xs text-white/40">11:46</span>
                      </div>
                      <div className="bg-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 backdrop-blur">
                        <p className="text-sm text-white/90 leading-relaxed">Hey team! The first draft of the script is ready for your review. Let me know your thoughts!</p>
                      </div>
                    </div>
                  </div>

                  <div className="chat-bubble-2 flex items-start gap-3 flex-row-reverse">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 ring-2 ring-cyan-500/30 flex items-center justify-center text-white font-semibold text-sm">Y</div>
                    <div className="flex-1 min-w-0 flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-1 flex-row-reverse">
                        <span className="text-sm font-semibold text-white">You</span>
                        <span className="text-xs text-white/40">11:47</span>
                      </div>
                      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                        <p className="text-sm text-white leading-relaxed">Awesome! Taking a look now. Thanks, Sarah!</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl ring-1 ring-white/5 group">
                  <input type="text" placeholder="Type your message..." readOnly className="flex-1 bg-transparent text-sm text-white/60 placeholder:text-white/30 outline-none cursor-not-allowed" />
                  <button type="button" className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center opacity-50 cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                </div>
              </div>

              <div className="px-6 sm:px-8 py-4 bg-slate-900/60 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/90">Preview Assets</div>
                    <div className="text-xs text-white/50">3 files available</div>
                  </div>
                </div>
                <button type="button" className="group px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-medium text-white shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span className="hidden sm:inline ml-2">Download</span>
                </button>
              </div>
            </div>

            <div className="absolute -inset-4 bg-gradient-to-br from-cyan-500/15 via-blue-600/15 to-violet-600/15 blur-3xl -z-10 opacity-50" />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(15, 23, 42, 0.08) 55%, rgba(15, 23, 42, 0.18) 100%)" }} />
    </section>
  );
}

function Feature({ icon, label, color }: { icon: React.ReactNode; label: string; color: 'cyan' | 'violet' | 'blue' }) {
  const colorMap: Record<typeof color, { wrap: string; icon: string }> = {
    cyan: { wrap: 'bg-cyan-500/10 ring-cyan-500/20', icon: 'text-cyan-600' },
    violet: { wrap: 'bg-violet-500/10 ring-violet-500/20', icon: 'text-violet-600' },
    blue: { wrap: 'bg-blue-500/10 ring-blue-500/20', icon: 'text-blue-600' },
  } as any;
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center h-10 w-10 rounded-full ring-1 ${colorMap[color].wrap}`}>
        <div className={colorMap[color].icon}>{icon}</div>
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}





