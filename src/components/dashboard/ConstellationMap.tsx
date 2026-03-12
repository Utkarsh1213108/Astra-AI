import { useEffect, useRef } from 'react';

const ConstellationMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const satellites = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      radius: 90 + Math.random() * 40,
      speed: 0.002 + Math.random() * 0.003,
      size: 2 + Math.random() * 2,
      alert: i === 5,
    }));

    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      size: Math.random() * 1.5,
      alpha: Math.random(),
    }));

    let time = 0;
    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Stars
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 200, 255, ${0.3 + Math.sin(time * 2 + s.alpha * 10) * 0.2})`;
        ctx.fill();
      });

      const cx = w / 2;
      const cy = h / 2;
      const globeR = Math.min(w, h) * 0.32;

      // Globe glow
      const glow = ctx.createRadialGradient(cx, cy, globeR * 0.5, cx, cy, globeR * 1.3);
      glow.addColorStop(0, 'hsla(199, 89%, 48%, 0.15)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Globe
      ctx.beginPath();
      ctx.arc(cx, cy, globeR, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(199, 89%, 48%, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Grid lines on globe
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const lat = -globeR + (i / 5) * globeR * 2;
        const latR = Math.sqrt(globeR * globeR - lat * lat);
        if (latR > 0) {
          ctx.ellipse(cx, cy + lat, latR, latR * 0.15, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'hsla(199, 89%, 48%, 0.12)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const ang = (i / 8) * Math.PI;
        ctx.ellipse(cx, cy, globeR * Math.cos(ang), globeR, ang + time * 0.1, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(199, 89%, 48%, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Orbit paths
      satellites.forEach(sat => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, sat.radius, sat.radius * 0.4, 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(199, 89%, 48%, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Satellites
      satellites.forEach(sat => {
        sat.angle += sat.speed;
        const sx = cx + Math.cos(sat.angle) * sat.radius;
        const sy = cy + Math.sin(sat.angle) * sat.radius * 0.4;

        if (sat.alert) {
          ctx.beginPath();
          ctx.arc(sx, sy, 8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(45, 93%, 47%, ${0.3 + Math.sin(time * 5) * 0.2})`;
          ctx.fill();
        }

        // Satellite body
        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = sat.alert ? 'hsl(45, 93%, 47%)' : 'hsl(199, 89%, 70%)';
        ctx.fillRect(-sat.size, -1, sat.size * 2, 2);
        ctx.fillRect(-1, -sat.size, 2, sat.size * 2);
        ctx.restore();
      });

      time += 0.016;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg p-3 relative overflow-hidden h-full">
      <div className="absolute top-3 left-0 right-0 flex justify-between px-3 z-10">
        <span className="text-muted-foreground text-[10px] font-display tracking-wider">PRIVATE SATELLITES</span>
        <span className="text-muted-foreground text-[10px] font-display tracking-wider">CONSTELLATION MAP</span>
        <span className="text-muted-foreground text-[10px] font-display tracking-wider">PRIVATE SATELLITE</span>
      </div>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 bg-warning/20 border border-warning/50 rounded-full px-3 py-1 glow-warning">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-warning text-xs font-display">ALERT: SAT-312</span>
        </div>
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default ConstellationMap;
