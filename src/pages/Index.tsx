import { Link } from 'react-router-dom';
import { Rocket, Shield, Zap, Brain, BarChart3, Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Brain, title: 'Deep Learning Engine', desc: 'LSTM Autoencoders detect anomalies before they become failures.' },
  { icon: Zap, title: 'Autonomous Action', desc: 'Instant corrective commands executed without human delay.' },
  { icon: Shield, title: 'Continuous Monitoring', desc: '24/7 real-time ingestion of satellite telemetry data.' },
  { icon: BarChart3, title: 'Dynamic Risk Scoring', desc: 'Real-time health index per satellite subsystem.' },
  { icon: Globe, title: 'Constellation View', desc: 'Monitor entire fleets from a single pane of glass.' },
  { icon: Rocket, title: 'RUL Prediction', desc: 'Remaining Useful Life forecasting for proactive maintenance.' },
];

const stats = [
  { value: '$1.2B', label: 'Lost annually to satellite failures' },
  { value: '60%', label: 'Of anomalies go undetected' },
  { value: '<100ms', label: 'Alert to action response time' },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            <span className="font-display text-lg text-primary text-glow-primary">ASTRA AI</span>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" className="font-display text-xs tracking-wider border-primary/30 text-primary hover:bg-primary/10">
              Launch Dashboard <ArrowRight className="ml-2 w-3 h-3" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 gradient-radial-space overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-4 px-4 py-1 rounded-full border border-primary/30 bg-primary/5">
            <span className="font-display text-[10px] tracking-widest text-primary">AUTONOMOUS SATELLITE HEALTH MONITORING</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
            Your Satellite's<br />
            <span className="text-primary text-glow-primary">Digital Autopilot</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8 font-body">
            From Alert → To Action, in milliseconds. Astra AI uses deep learning to detect anomalies and autonomously execute corrective actions.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/dashboard">
              <Button size="lg" className="font-display text-xs tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                Enter Mission Control
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-3 gap-6 relative z-10">
          {stats.map((s, i) => (
            <div key={i} className="text-center p-4 rounded-lg border border-border bg-card/50 backdrop-blur-sm">
              <div className="font-display text-2xl text-primary text-glow-primary font-bold">{s.value}</div>
              <div className="text-muted-foreground text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl text-center text-foreground mb-12">
            What Makes <span className="text-primary">Astra AI</span> Different
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="p-6 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group">
                <f.icon className="w-8 h-8 text-primary mb-3 group-hover:text-glow-primary transition-all" />
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-2xl text-foreground mb-8">System Architecture</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['Satellite Telemetry', 'Ingestion Engine', 'Deep Autoencoder', 'Decision Logic', 'Command Execution'].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
                  <span className="font-heading text-sm font-semibold text-primary">{step}</span>
                </div>
                {i < 4 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-6">End-to-end autonomous pipeline from raw sensor data to in-orbit corrective action.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="font-display text-xs text-primary">ASTRA AI</span>
            <span className="text-muted-foreground text-xs ml-2">Team Innovate India — IIT Mandi</span>
          </div>
          <span className="text-muted-foreground text-xs">astraai.spacetech@gmail.com</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
