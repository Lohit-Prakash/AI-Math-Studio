import React from 'react';
import { 
  ArrowRight, Brain, Zap, Activity, Users, Star, 
  Layers, Code, Calculator, TrendingUp, ShieldCheck,
  MessageSquare, MousePointer, Play, Camera, Ruler,
  FileCode, Sparkles, ScanLine, Share2, GraduationCap, Briefcase
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HomePageProps {
  onLaunch: () => void;
  onSelectQuery?: (query: string) => void;
}

// Mock data for the landing page graph demo
const demoGraphData = Array.from({ length: 20 }, (_, i) => ({
  name: i,
  value: Math.pow(i, 2) + 10 * i + 50 + (Math.random() * 20),
  prediction: Math.pow(i, 2.1) + 10 * i + 40
}));

export const HomePage: React.FC<HomePageProps> = ({ onLaunch, onSelectQuery }) => {
  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleExampleClick = (query: string) => {
    if (onSelectQuery) {
      onSelectQuery(query);
    } else {
      onLaunch();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] bg-indigo-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] bg-pink-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Calculator className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            AI Math Studio
          </span>
        </div>
        <button 
          onClick={onLaunch}
          className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-700 hover:border-cyan-500/50 rounded-full text-sm font-medium transition-all hover:bg-slate-800 hover:text-cyan-400 group"
        >
          Launch App <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-xs font-medium mb-4 animate-fade-in backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-cyan-400" /> 
            <span>Now with Gemini 3.0 Pro & Computer Vision</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Ultimate Math Engine</span><br />
            For The AI Era.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            From handwritten equations to complex engineering simulations. 
            Snap a photo, describe a concept, or edit the logic directly. 
            We build the model, you solve the problem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <button 
              onClick={onLaunch}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all transform hover:-translate-y-1 flex items-center gap-3 text-lg"
            >
              Start Calculating <Zap className="w-5 h-5" />
            </button>
            <a 
              href="#features"
              onClick={scrollToFeatures}
              className="px-8 py-4 bg-slate-900/50 hover:bg-slate-800 text-white font-medium rounded-2xl border border-slate-700 backdrop-blur-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Explore Features <ArrowRight className="w-4 h-4 opacity-50" />
            </a>
          </div>
        </div>

        {/* Hero Visual (Graph Demo) */}
        <div className="mt-24 max-w-5xl mx-auto animate-slide-up">
          <div className="relative bg-slate-900/80 border border-slate-700/50 rounded-3xl p-2 md:p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
             <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
             <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
             
             <div className="flex items-center justify-between mb-6 px-4 pt-2">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-cyan-400" />
                   </div>
                   <div>
                      <div className="text-sm font-semibold text-white">Live Simulation</div>
                      <div className="text-xs text-slate-400 font-mono">Prediction Model v2.5</div>
                   </div>
                </div>
                <div className="flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                </div>
             </div>

             <div className="h-[300px] w-full bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden relative">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={demoGraphData}>
                   <defs>
                     <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                   <XAxis dataKey="name" hide />
                   <YAxis hide />
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                     itemStyle={{ color: '#e2e8f0' }}
                   />
                   <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" isAnimationActive={true} />
                   <Area type="monotone" dataKey="prediction" stroke="#818cf8" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPred)" isAnimationActive={true} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      </section>

      {/* Workflow Section (New) */}
      <section className="py-24 bg-slate-950 border-y border-slate-900 relative">
        <div className="max-w-6xl mx-auto px-6">
           <div className="text-center mb-16">
              <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-2">The Workflow</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white">From Idea to Insight in Seconds</h3>
           </div>
           
           <div className="grid md:grid-cols-4 gap-8 relative">
              {/* Connector Line */}
              <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-800 to-transparent z-0"></div>
              
              <WorkflowStep 
                step="01" 
                icon={Camera} 
                title="Input" 
                desc="Type a query or snap a photo of a textbook problem." 
              />
              <WorkflowStep 
                step="02" 
                icon={Brain} 
                title="Analyze" 
                desc="Gemini 3.0 Pro reasons through the physics & logic." 
              />
              <WorkflowStep 
                step="03" 
                icon={Layers} 
                title="Visualize" 
                desc="Engine builds an interactive React app instantly." 
              />
              <WorkflowStep 
                step="04" 
                icon={FileCode} 
                title="Export" 
                desc="Download Python code or PDF reports for your work." 
              />
           </div>
        </div>
      </section>

      {/* Interactive Examples */}
      <section className="py-24 bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Try it yourself</h2>
              <p className="text-slate-400 max-w-lg">
                Click any example below to launch the engine with a pre-configured scenario.
              </p>
            </div>
            <div className="flex gap-2">
               <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">Physics</span>
               <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">Finance</span>
               <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">Math</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <button onClick={() => handleExampleClick("Calculate monthly mortgage payment for a $500k house at 3.5% interest")} className="text-left w-full h-full">
              <ExampleCard 
                query="Calculate monthly mortgage payment for a $500k house at 3.5% interest"
                category="Finance"
                resultPreview="$2,245.22 / mo"
              />
            </button>
            <button onClick={() => handleExampleClick("Simulation of a projectile launched at 45 degrees with 50m/s velocity")} className="text-left w-full h-full">
              <ExampleCard 
                query="Simulation of a projectile launched at 45 degrees with 50m/s velocity"
                category="Physics"
                resultPreview="Range: 255.1m"
              />
            </button>
            <button onClick={() => handleExampleClick("Volume of a cylinder with radius 5 and height 10")} className="text-left w-full h-full">
              <ExampleCard 
                query="Volume of a cylinder with radius 5 and height 10"
                category="Geometry"
                resultPreview="785.4 units³"
              />
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-950 relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Pro-Grade Capabilities</h2>
            <p className="text-slate-400">Built for students, engineers, and professionals who need accuracy.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Brain} 
              title="Deep Thinking Mode" 
              desc="Uses Gemini 3.0 Pro's expanded token budget to reason through multi-step engineering problems before solving."
              badge="New"
            />
            <FeatureCard 
              icon={Camera} 
              title="Snap & Solve" 
              desc="Multimodal input allows you to upload images of handwritten equations or diagrams for instant analysis."
              badge="Vision"
            />
            <FeatureCard 
              icon={FileCode} 
              title="Code Synthesis" 
              desc="Don't just get the answer. Export the underlying logic to Python, Excel, or MATLAB for your projects."
              badge="Export"
            />
            <FeatureCard 
              icon={MessageSquare} 
              title="AI Context Tutor" 
              desc="Chat with the result. Ask 'Why?' or 'What if?' and get answers grounded in the current mathematical context."
            />
            <FeatureCard 
              icon={Ruler} 
              title="Unit Intelligence" 
              desc="Smart inputs automatically detect and convert units (e.g., '50 ft' to 'meters') to prevent calculation errors."
            />
            <FeatureCard 
              icon={Code} 
              title="Formula Studio" 
              desc="Full access to the generated JavaScript and LaTeX. Edit the logic manually and sync changes in real-time."
            />
            <FeatureCard 
              icon={Layers} 
              title="Dynamic Visualizer" 
              desc="SVG & Canvas simulations that follow real physics laws (gravity, momentum) and adapt to your inputs."
            />
            <FeatureCard 
              icon={TrendingUp} 
              title="Interactive Graphing" 
              desc="Zoom, pan, and inspect data points on generated charts. Analyze trends with precision."
            />
            <FeatureCard 
              icon={ShieldCheck} 
              title="Secure & Private" 
              desc="Your queries and images are processed securely. We prioritize data privacy and model safety."
            />
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 bg-gradient-to-b from-slate-900/50 to-slate-950 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-6">
           <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-md">
                 <h2 className="text-3xl font-bold text-white mb-6">Who is this for?</h2>
                 <p className="text-slate-400 leading-relaxed mb-6">
                   Whether you are a student visualizing calculus or an engineer estimating load factors, 
                   AI Math Studio bridges the gap between text and technical execution.
                 </p>
                 <button onClick={onLaunch} className="text-cyan-400 font-medium hover:text-cyan-300 flex items-center gap-2">
                    Get Started Now <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <AudienceCard icon={GraduationCap} title="Students" items={['Visual Homework', 'Concept Tutors']} />
                  <AudienceCard icon={Briefcase} title="Engineers" items={['Quick Prototyping', 'Code Export']} />
                  <AudienceCard icon={TrendingUp} title="Analysts" items={['Financial Models', 'Forecasting']} />
                  <AudienceCard icon={Users} title="Educators" items={['Live Demos', 'Custom Tools']} />
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950 relative z-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500">
              AI Math Studio
            </span>
            <p className="text-slate-500 text-sm mt-2">
              The next generation of mathematical computing.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
             <p className="text-slate-500 text-sm">
                Designed & Developed by <span className="text-white font-medium">Lohit Prakash</span>
             </p>
             <div className="flex gap-6 text-sm text-slate-600">
                <a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a>
                <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
                <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Helper Components for Home Page ---

const WorkflowStep = ({ step, icon: Icon, title, desc }: any) => (
  <div className="relative z-10 flex flex-col items-center text-center group">
     <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-xl shadow-black/50 group-hover:-translate-y-2 transition-transform duration-300">
        <Icon className="w-8 h-8 text-cyan-500" />
     </div>
     <div className="text-xs font-mono text-slate-600 mb-2">STEP {step}</div>
     <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
     <p className="text-sm text-slate-400 max-w-[200px] leading-relaxed">{desc}</p>
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc, badge }: any) => (
  <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-cyan-500/30 transition-all hover:bg-slate-800/80 group relative overflow-hidden">
    {badge && (
      <div className="absolute top-4 right-4 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
        {badge}
      </div>
    )}
    <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/10 transition-colors border border-slate-800">
      <Icon className="w-6 h-6 text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
  </div>
);

const ExampleCard = ({ query, category, resultPreview }: any) => (
  <div className="p-1 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 hover:from-cyan-500/20 hover:to-indigo-500/20 transition-all duration-300 group h-full">
    <div className="bg-slate-950 p-5 rounded-xl h-full flex flex-col justify-between border border-slate-800/50 group-hover:border-transparent">
      <div>
        <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
             <MessageSquare className="w-3 h-3" /> {category}
           </div>
           <MousePointer className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-slate-200 font-medium mb-4 text-sm">"{query}"</p>
      </div>
      <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
        <span className="text-xs text-slate-500">Auto-generated result:</span>
        <span className="text-sm font-mono font-bold text-indigo-400">{resultPreview}</span>
      </div>
    </div>
  </div>
);

const AudienceCard = ({ icon: Icon, title, items }: any) => (
  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors">
    <div className="flex items-center gap-2 mb-3">
       <Icon className="w-4 h-4 text-indigo-400" />
       <h3 className="text-sm font-bold text-white">{title}</h3>
    </div>
    <ul className="space-y-1.5">
      {items.map((item: string) => (
        <li key={item} className="text-xs text-slate-400 flex items-center gap-2">
          <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
          {item}
        </li>
      ))}
    </ul>
  </div>
);