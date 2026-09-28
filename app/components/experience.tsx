"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import SmoothScroll from "./smooth-scroll";
import InkHero from "./ink-hero";
import ObjectPlayground from "./object-playground";
import Showreel from "./showreel";
import Wordmark from "./wordmark";

const projects = [
  {
    name: "Utopia",
    text: "A fresh perspective on good taste.",
    type: "Strategy · Brand identity",
    image: "work-vignette-utopia-V2.jpg",
    year: "2026",
  },
  {
    name: "Aurbse",
    text: "A new way of looking at our world.",
    type: "Art direction · Digital",
    image: "work-vignette-aurbse-V2.jpg",
    year: "2026",
  },
  {
    name: "In_Cognita",
    text: "Make room for the unexpected.",
    type: "Brand identity · Experience",
    image: "work-vignette-in-cognita-V3-2.jpg",
    year: "2025",
  },
  {
    name: "Lgm",
    text: "Precision with a different perspective.",
    type: "Strategy · Visual system",
    image: "work-vignette-lgm-V2.jpg",
    year: "2025",
  },
  {
    name: "Haptify",
    text: "An identity you can almost feel.",
    type: "Brand identity · Digital",
    image: "work-vignette-haptify-V2.jpg",
    year: "2026",
  },
];
type Project = (typeof projects)[number];

function RevealImage({
  src,
  alt,
  className = "",
  direction = "up",
}: {
  src: string;
  alt: string;
  className?: string;
  direction?: "left" | "right" | "up";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Observe the full layout box, never the initially clipped image itself.
  const revealed = useInView(ref, {
    once: true,
    amount: 0,
    margin: "0px 0px -12% 0px",
  });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return (
    <div ref={ref} className={`reveal-image ${className}`}>
      <motion.div
        className="reveal-image-mask"
        initial={false}
        animate={{
          clipPath:
            revealed || reduced
              ? "inset(0% 0% 0% 0%)"
              : direction === "left"
                ? "inset(100% 100% 0% 0%)"
                : direction === "right"
                  ? "inset(100% 0% 0% 100%)"
                  : "inset(100% 0% 0% 0%)",
        }}
        transition={{ duration: reduced ? 0 : 1.2, ease: [0.76, 0, 0.24, 1] }}
      >
        <motion.img
          src={`/media/${src}`}
          alt={alt}
          loading="lazy"
          style={{ y: reduced ? 0 : y }}
        />
      </motion.div>
    </div>
  );
}

function Exhibition() {
  const ref = useRef<HTMLElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false),
    [playing, setPlaying] = useState(true),
    [startScale, setStartScale] = useState(2.18);
  const scene = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const visible = useInView(ref, { margin: "100px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // The 16:9 scene and video share coordinates, so the final screen stays
  // registered to the architecture regardless of viewport aspect ratio.
  const scale = useTransform(scrollYProgress, [0, 0.82, 1], [startScale, 1, 1]);
  const shade = useTransform(scrollYProgress, [0, 0.7], [0.7, 0]);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (scene.current)
        setStartScale(
          Math.max(
            innerWidth / (scene.current.clientWidth * 0.4635),
            innerHeight / (scene.current.clientHeight * 0.504),
          ) * 1.02,
        );
    });
    if (scene.current) observer.observe(scene.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!video.current) return;
    if (visible && playing && !reduced) video.current.play().catch(() => {});
    else video.current.pause();
  }, [visible, playing, reduced]);
  return (
    <section
      ref={ref}
      className="exhibition"
      aria-label="Our manifesto, inside the exhibition"
    >
      <div className="exhibition-sticky">
        <div className="gallery-scene" ref={scene}>
          <Image
            className="gallery-room"
            src="/media/_photography-frontal-shot-of-a-huge-large-169-white__495122.webp"
            alt="Concrete exhibition hall with a large central cinema screen"
            fill
            sizes="(max-width: 767px) 100vw, 180vh"
          />
          <motion.div
            className="gallery-shade"
            style={{ opacity: reduced ? 0 : shade }}
          />
          <motion.div
            className="gallery-screen"
            style={{ scale: reduced ? 1 : scale }}
          >
            <video
              ref={video}
              src="/media/manifesto2.mp4"
              poster="/media/manifesto-poster.jpg"
              muted={!sound}
              loop
              playsInline
              preload="none"
            />
          </motion.div>
        </div>
        <div className="cinema-controls">
          <button onClick={() => setSound(!sound)} aria-pressed={sound}>
            Sound <span className={`toggle ${sound ? "on" : ""}`} />
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            aria-label={
              playing ? "Pause exhibition film" : "Play exhibition film"
            }
          >
            {playing ? "Ⅱ" : "▷"}
          </button>
        </div>
        <div className="cinema-caption">
          <span>( A different perspective )</span>
          <span>Scroll to step inside ↘</span>
        </div>
      </div>
    </section>
  );
}

export default function Experience() {
  const [menu, setMenu] = useState(false),
    [project, setProject] = useState<Project | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    menuDialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    if (menu || project) document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [menu, project]);
  useEffect(() => {
    if (menu) menuDialog.current?.showModal();
    else menuDialog.current?.close();
  }, [menu]);
  useEffect(() => {
    if (project) dialog.current?.showModal();
    else dialog.current?.close();
  }, [project]);
  const closeMenu = () => {
    setMenu(false);
    menuButton.current?.focus();
  };
  return (
    <>
      <SmoothScroll />
      <a className="skip-link" href="#works">
        Skip to work
      </a>
      <header className="site-header">
        <a href="#top" className="monogram" aria-label="Nothin home">
          N<span>’</span>
        </a>
        <button
          ref={menuButton}
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-controls="navigation"
        >
          Menu <span className="menu-dots">∷</span>
        </button>
      </header>
      <dialog
        id="navigation"
        ref={menuDialog}
        className="menu-dialog"
        onCancel={closeMenu}
        onClose={() => setMenu(false)}
        data-lenis-prevent
      >
        <button className="close-menu" onClick={closeMenu}>
          Close ×
        </button>
        <span className="eyebrow">A different perspective.</span>
        <nav>
          {[
            ["Works", "works"],
            ["Studio", "studio"],
            ["Contact", "contact"],
          ].map(([label, id], i) => (
            <a key={id} href={`#${id}`} onClick={closeMenu}>
              <sup>0{i + 1}</sup>
              {label}
              <span>↗</span>
            </a>
          ))}
        </nav>
        <a className="menu-email" href="mailto:hello@noth.in">
          hello@noth.in ↗
        </a>
      </dialog>
      <main>
        <div className="hero-stage">
          <section id="top" className="hero">
            <div className="hero-intro">
              <p>
                Not a style, a perspective.
                <br />
                Because Nothin’ is Everythin’.
              </p>
              <a className="pill dark" href="#contact">
                Let’s talk <span>↗</span>
              </a>
            </div>
            <Wordmark hero />
            <div className="hero-bottom">
              <span>
                Independent creative studio
                <br />
                Paris, France · Everywhere
              </span>
              <span className="hero-hint">
                Move your cursor. Shift your perspective.
              </span>
              <a href="#intro">
                Scroll to explore <span>↓</span>
              </a>
            </div>
          </section>
          <section id="intro" className="intro-heading">
            <h2>
              Most brands produce content.
              <br />
              We prefer ideas.
            </h2>
          </section>
          <InkHero />
        </div>
        <Showreel />
        <section id="works" className="works-section">
          <div className="section-top">
            <span className="eyebrow">Selected works / 01—05</span>
            <h2>
              Good ideas connect.
              <br />
              Great ideas surprise.
            </h2>
          </div>
          <div className="projects-grid">
            {projects.map((p, i) => (
              <article key={p.name} className={`project project-${i + 1}`}>
                <button
                  className="project-button"
                  onClick={() => setProject(p)}
                  aria-label={`Explore ${p.name}`}
                >
                  <div className="project-caption">
                    <span>{p.name}</span>
                    <h3>{p.text}</h3>
                  </div>
                  <RevealImage
                    src={p.image}
                    alt={`${p.name} brand identity project`}
                    direction={(["left", "right", "up"] as const)[i % 3]}
                  />
                  <span className="project-hover">Explore ↗</span>
                  <div className="project-meta">
                    <span>{p.type}</span>
                    <span>/{p.year}</span>
                  </div>
                </button>
              </article>
            ))}
          </div>
          <div className="work-bottom">
            <span>Different fields. Same curiosity.</span>
            <a href="#contact" className="pill light">
              Your project next? <span>↗</span>
            </a>
            <span>© 24—26</span>
          </div>
        </section>
        <Exhibition />
        <section id="studio" className="studio-section">
          <div className="studio-intro">
            <span className="eyebrow">( The studio )</span>
            <h2>
              An open space.
              <br />
              For unexpected ideas.
            </h2>
            <p>
              A brand. A campaign. A space. An experience.
              <br />
              We begin with possibility and see where it takes us.
            </p>
          </div>
          <div className="studio-pictures">
            <div>
              <RevealImage
                src="beton-plastic-V2.jpg"
                alt="Sculptural concrete form wrapped in soft material"
              />
              <span>Something familiar.</span>
            </div>
            <div>
              <RevealImage
                src="boule-chelou-coline-V2.jpg"
                alt="Surreal silver sculpture floating above a green landscape"
              />
              <span>Seen a little differently.</span>
            </div>
          </div>
          <h2 className="perspective-title">
            Forms follow
            <br />
            <span>perspective.</span>
          </h2>
          <div className="services">
            <span>We design:</span>
            <ul>
              <li>Brand identities</li>
              <li>Campaigns</li>
              <li>Digital experiences</li>
              <li>Events</li>
              <li>Visual systems</li>
            </ul>
            <p>
              Where strategic thinking
              <br />
              meets visual culture.
            </p>
          </div>
          <ObjectPlayground />
        </section>
        <section className="people-section">
          <RevealImage
            src="ponpon.jpg"
            alt="A playful silver character standing in a metallic elevator"
          />
          <div className="people-copy">
            <span>( Nothin’ without people )</span>
            <h2>
              Different minds.
              <br />
              Shared curiosity.
            </h2>
            <p>
              Strategists, designers, makers.
              <br />A collective built around the idea.
            </p>
          </div>
          <div className="people-stamp">
            WE ARE
            <br />
            NOTHIN’
          </div>
        </section>
        <section className="closing-section">
          <h2>
            We create brand
            <br />
            experiences for
            <br />
            those ready to go
            <br />
            beyond the
            <br />
            <span>ordinary.</span>
          </h2>
          <RevealImage
            className="closing-small"
            src="saussice-V2.jpg"
            alt="Playful sausage packaging art direction"
          />
          <RevealImage
            className="closing-large"
            src="ballon-bureau-V2.jpg"
            alt="An unexpected pink balloon sculpture in an office"
          />
        </section>
        <footer id="contact">
          <div className="contact-row">
            <div>
              <span className="eyebrow">Have something in mind?</span>
              <h2>
                Let’s start
                <br />
                from nothin’.
              </h2>
              <a className="pill light" href="mailto:hello@noth.in">
                Drop us an email <span>↗</span>
              </a>
            </div>
            <div className="footer-links">
              <a
                href="https://www.instagram.com/nooothinatall/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram ↗
              </a>
              <a
                href="https://www.linkedin.com/company/nothin/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn ↗
              </a>
              <a href="#top">Back to top ↑</a>
            </div>
          </div>
          <Wordmark />
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Nothin’</span>
            <span>Independent minds. Infinite possibilities.</span>
            <span>Paris · Everywhere</span>
          </div>
        </footer>
      </main>
      <dialog
        ref={dialog}
        className="project-dialog"
        onCancel={() => setProject(null)}
        onClose={() => setProject(null)}
        data-lenis-prevent
      >
        <AnimatePresence>
          {project && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                className="close-project"
                onClick={() => setProject(null)}
              >
                Close ×
              </button>
              <span className="eyebrow">
                {project.type} / {project.year}
              </span>
              <h2>{project.name}</h2>
              <Image
                src={`/media/${project.image}`}
                alt={`${project.name} project overview`}
                width={1600}
                height={1100}
                sizes="90vw"
              />
              <div className="project-dialog-bottom">
                <h3>{project.text}</h3>
                <a className="pill light" href="mailto:hello@noth.in">
                  Start a similar project ↗
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </dialog>
    </>
  );
}
