// Animation Modules
const AnimationSystem = {
    init() {
        this.initGSAP();
        this.initBackgroundOrbs();
        this.initMouseTrail();
        this.initParticles();
        this.initSmoothScroll();
        this.initMagneticButtons();
        this.initImageReveal();
        this.initSVGAnimations();
    },

    initGSAP() {
        gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
    },

    initBackgroundOrbs() {
        const orbSettings = [
            { selector: '.orb-1', range: 50, duration: 20 },
            { selector: '.orb-2', range: 30, duration: 15 },
            { selector: '.orb-3', range: 40, duration: 18 }
        ];

        orbSettings.forEach(({ selector, range, duration }) => {
            gsap.to(selector, {
                x: `random(${-range}, ${range})`,
                y: `random(${-range}, ${range})`,
                duration,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        });
    },

    initMouseTrail() {
        const cursor = document.querySelector('.cursor-dot');
        const cursorTrail = document.querySelector('.cursor-trail');
        let isHovered = false;

        document.addEventListener('mousemove', (e) => {
            gsap.to(cursor, {
                x: e.clientX,
                y: e.clientY,
                duration: 0
            });

            gsap.to(cursorTrail, {
                x: e.clientX - 12,
                y: e.clientY - 12,
                duration: 0.1,
                scale: isHovered ? 1.5 : 1
            });
        });

        // Hover effect on interactive elements
        document.querySelectorAll('a, button, .interactive').forEach(el => {
            el.addEventListener('mouseenter', () => {
                isHovered = true;
                gsap.to(cursorTrail, { scale: 1.5, duration: 0.3 });
            });

            el.addEventListener('mouseleave', () => {
                isHovered = false;
                gsap.to(cursorTrail, { scale: 1, duration: 0.3 });
            });
        });
    },

    initParticles() {
        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            document.querySelector('.particle-container').appendChild(particle);

            const size = Math.random() * 4 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            const startX = Math.random() * window.innerWidth;
            const startY = window.innerHeight + 100;

            gsap.fromTo(particle,
                {
                    x: startX,
                    y: startY,
                    opacity: 1
                },
                {
                    y: -100,
                    opacity: 0,
                    duration: Math.random() * 5 + 5,
                    ease: 'none',
                    onComplete: () => {
                        particle.remove();
                        createParticle();
                    }
                }
            );
        };

        for (let i = 0; i < 50; i++) {
            createParticle();
        }
    },

    initSmoothScroll() {
        gsap.to('.scroll-content', {
            y: () => -(document.querySelector('.scroll-content').offsetHeight - window.innerHeight),
            ease: 'none',
            scrollTrigger: {
                trigger: '.scroll-content',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1,
                invalidateOnRefresh: true
            }
        });
    },

    initMagneticButtons() {
        document.querySelectorAll('.magnetic-wrap').forEach(wrap => {
            const area = wrap.querySelector('.magnetic-area');
            const distance = 40;

            const magneticEffect = (e) => {
                const { left, top, width, height } = wrap.getBoundingClientRect();
                const x = e.clientX - (left + width/2);
                const y = e.clientY - (top + height/2);

                gsap.to(area, {
                    x: x * distance/width,
                    y: y * distance/height,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            };

            wrap.addEventListener('mousemove', magneticEffect);
            wrap.addEventListener('mouseleave', () => {
                gsap.to(area, {
                    x: 0,
                    y: 0,
                    duration: 0.7,
                    ease: 'elastic.out(1, 0.3)'
                });
            });
        });
    },

    initImageReveal() {
        gsap.utils.toArray('.image-reveal').forEach(image => {
            gsap.to(image, {
                '--clip-start': '100%',
                duration: 1,
                ease: 'power2.inOut',
                scrollTrigger: {
                    trigger: image,
                    start: 'top center',
                    end: 'bottom center',
                    toggleActions: 'play none none reverse'
                }
            });
        });
    },

    initSVGAnimations() {
        gsap.to('.svg-wave', {
            attr: { d: 'M0,50 Q25,70 50,50 T100,50' },
            duration: 5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        });

        gsap.to('.svg-circle', {
            strokeDashoffset: 0,
            duration: 2,
            ease: 'power2.inOut'
        });
    }
};

// Export the animation system
export default AnimationSystem; 