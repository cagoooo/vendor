import { useEffect, useRef, useCallback } from 'react';

interface ConfettiProps {
    isActive: boolean;
    duration?: number;
    particleCount?: number;
    colors?: string[];
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    shape: 'rect' | 'circle';
}

export function Confetti({
    isActive,
    duration = 3000,
    particleCount = 100,
    colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3']
}: ConfettiProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const particlesRef = useRef<Particle[]>([]);
    const startTimeRef = useRef<number>(0);

    const createParticles = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return [];

        const particles: Particle[] = [];
        const centerX = canvas.width / 2;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: centerX + (Math.random() - 0.5) * 200,
                y: -20,
                vx: (Math.random() - 0.5) * 15,
                vy: Math.random() * 5 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                shape: Math.random() > 0.5 ? 'rect' : 'circle'
            });
        }

        return particles;
    }, [particleCount, colors]);

    const animate = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const elapsed = timestamp - startTimeRef.current;
        if (elapsed > duration) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const gravity = 0.15;
        const friction = 0.99;

        particlesRef.current.forEach((particle) => {
            particle.vy += gravity;
            particle.vx *= friction;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;

            // Fade out towards the end
            const fadeStart = duration * 0.7;
            const opacity = elapsed > fadeStart
                ? 1 - (elapsed - fadeStart) / (duration - fadeStart)
                : 1;

            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate((particle.rotation * Math.PI) / 180);
            ctx.globalAlpha = opacity;
            ctx.fillStyle = particle.color;

            if (particle.shape === 'rect') {
                ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });

        animationRef.current = requestAnimationFrame(animate);
    }, [duration]);

    useEffect(() => {
        if (isActive) {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            particlesRef.current = createParticles();
            startTimeRef.current = performance.now();
            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive, createParticles, animate]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isActive) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ mixBlendMode: 'screen' }}
        />
    );
}

export default Confetti;
