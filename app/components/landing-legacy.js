"use client";
import "../legacy.css";

import Link from "next/link";
import { useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { transformations } from "./data/transformations";

const facilities = [
	{
		image: "/facilities/general-training.jpeg",
		alt: "General Training",
		title: "General Training",
	},
	{
		image: "/facilities/diet-plan.jpg",
		alt: "Diet Plan",
		title: "Diet Plan",
	},
	{
		image: "/facilities/cardio.jpg",
		alt: "Cardio",
		title: "Cardio",
	},
	{
		image: "/facilities/strength-training.jpeg",
		alt: "Strength Training",
		title: "Strength Training",
	},
	{
		image: "/facilities/boxing.jpg",
		alt: "Boxing",
		title: "Boxing",
	},
	{
		image: "/facilities/karate.jpg",
		alt: "Karate",
		title: "Karate",
	},
	{
		image: "/facilities/Zumba.jpg",
		alt: "Zumba",
		title: "Zumba",
	},
	{
		image: "/facilities/yoga.jpg",
		alt: "Yoga",
		title: "Yoga",
	},
	{
		image: "/facilities/lockers.jpg",
		alt: "Lockers",
		title: "Lockers",
	},
	{
		image: "/facilities/steam-bath.jpg",
		alt: "Steam Bath",
		title: "Steam Bath & Shower",
	},
	{
		image: "/facilities/massage-chair.jpg",
		alt: "Massage Chair",
		title: "Full Body Massage Chair",
	},
	{
		image: "/facilities/green-tea.jpg",
		alt: "Green Tea",
		title: "Green Tea with Honey",
	},
	{
		image: "/facilities/black-cofee.jpeg",
		alt: "Black Coffee",
		title: "Black Coffee with Honey",
	},
];

export default function HomePage() {
	const featuredTransformations = transformations.slice(0, 3);

	const [emblaRef, emblaApi] = useEmblaCarousel(
		{
			loop: true,
			align: "start",
			dragFree: true,
		},
		[
			Autoplay({
				delay: 2300,
				stopOnMouseEnter: true,
				stopOnInteraction: false,
			}),
		],
	);

	useEffect(() => {
		const canvas = document.getElementById("frame-canvas");
		const context = canvas?.getContext("2d");
		const heroSection = document.getElementById("hero-scrub");

		if (!canvas || !context || !heroSection) return;

		const frameCount = 240;
		const images = [];
		const currentFrame = { index: 0 };
		let imagesLoaded = 0;

		const textStart = document.getElementById("text-start");
		const textMid = document.getElementById("text-mid");
		const textFinal = document.getElementById("text-final");

		const preloadImages = () => {
			for (let i = 1; i <= frameCount; i++) {
				const img = new Image();
				const padIndex = i.toString().padStart(3, "0");
				img.src = `/dumbel-frames/ezgif-frame-${padIndex}.jpg`;
				img.onload = () => {
					imagesLoaded++;
					if (imagesLoaded === 1) {
						resizeCanvas();
						requestAnimationFrame(() => updateCanvas(0));
						canvas.style.opacity = "1";
					}
				};
				images.push(img);
			}
		};

		const updateCanvas = (index) => {
			if (!images[index] || !images[index].complete) return;

			const img = images[index];
			context.clearRect(0, 0, canvas.width, canvas.height);

			const imgRatio = img.width / img.height;
			const canvasRatio = canvas.width / canvas.height;
			let drawWidth;
			let drawHeight;
			let offsetX;
			let offsetY;

			if (imgRatio > canvasRatio) {
				drawHeight = canvas.height;
				drawWidth = img.width * (canvas.height / img.height);
				offsetX = (canvas.width - drawWidth) / 2;
				offsetY = 0;
			} else {
				drawWidth = canvas.width;
				drawHeight = img.height * (canvas.width / img.width);
				offsetX = 0;
				offsetY = (canvas.height - drawHeight) / 2;
			}

			context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
		};

		const resizeCanvas = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			if (imagesLoaded > 0) {
				updateCanvas(currentFrame.index);
			}
		};

		const setOpacityScale = (element, opacity, scale) => {
			if (!element) return;
			element.style.opacity = String(opacity);
			element.style.transform = `scale(${scale})`;
		};

		const updateText = (progress) => {
			if (progress < 0.1) {
				const p = progress / 0.1;
				setOpacityScale(textStart, p, 0.95 + 0.05 * p);
			} else if (progress >= 0.1 && progress < 0.25) {
				setOpacityScale(textStart, 1, 1);
			} else if (progress >= 0.25 && progress < 0.35) {
				const p = (progress - 0.25) / 0.1;
				setOpacityScale(textStart, 1 - p, 1 + 0.05 * p);
			} else {
				setOpacityScale(textStart, 0, 0.95);
			}

			if (progress > 0.35 && progress < 0.45) {
				const p = (progress - 0.35) / 0.1;
				setOpacityScale(textMid, p, 0.95 + 0.05 * p);
			} else if (progress >= 0.45 && progress < 0.6) {
				setOpacityScale(textMid, 1, 1);
			} else if (progress >= 0.6 && progress < 0.7) {
				const p = (progress - 0.6) / 0.1;
				setOpacityScale(textMid, 1 - p, 1 + 0.05 * p);
			} else {
				setOpacityScale(textMid, 0, 0.95);
			}

			if (progress > 0.7 && progress < 0.8) {
				const p = (progress - 0.7) / 0.1;
				setOpacityScale(textFinal, p, 0.95 + 0.05 * p);
			} else if (progress >= 0.8) {
				setOpacityScale(textFinal, 1, 1);
			} else {
				setOpacityScale(textFinal, 0, 0.95);
			}
		};

		let ticking = false;
		const onScroll = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					const rect = heroSection.getBoundingClientRect();
					const scrollTop = -rect.top;
					const maxScroll = heroSection.offsetHeight - window.innerHeight;

					let progress = scrollTop / maxScroll;
					progress = Math.max(0, Math.min(1, progress));

					const frameIndex = Math.min(
						frameCount - 1,
						Math.floor(progress * frameCount),
					);

					if (frameIndex !== currentFrame.index) {
						updateCanvas(frameIndex);
						currentFrame.index = frameIndex;
					}

					updateText(progress);
					ticking = false;
				});
				ticking = true;
			}
		};

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add("visible");
					}
				});
			},
			{
				root: null,
				rootMargin: "0px",
				threshold: 0.15,
			},
		);

		const fadeElements = document.querySelectorAll(".fade-up");
		fadeElements.forEach((el) => observer.observe(el));

		window.addEventListener("resize", resizeCanvas);
		window.addEventListener("scroll", onScroll);

		preloadImages();

		return () => {
			window.removeEventListener("resize", resizeCanvas);
			window.removeEventListener("scroll", onScroll);
			observer.disconnect();
		};
	}, []);

	const onPrevFacility = () => {
		emblaApi?.scrollPrev();
	};

	const onNextFacility = () => {
		emblaApi?.scrollNext();
	};

	return (
		<>
			<main className="legacy-theme">
				<section className="hero-scrub-container" id="hero-scrub">
					<div className="sticky-container">
						<canvas id="frame-canvas"></canvas>
						<div className="sync-text text-start" id="text-start">
							Start Your Journey
						</div>
						<div className="sync-text text-mid" id="text-mid">
							Build Strength
						</div>
						<div className="sync-text text-final" id="text-final">
							Master Your Body
						</div>

						<div className="scroll-indicator">
							<span>Scroll to explore</span>
							<div className="mouse">
								<div className="wheel"></div>
							</div>
						</div>
					</div>
				</section>

				<section className="section packages-section" id="packages">
					<div className="container">
						<h2 className="section-title">Membership Plans</h2>
						<div className="packages-grid">
							<div className="package-card fade-up">
								<h3>1 Month</h3>
								<div className="price">
									<span className="old-price">Rs 5000</span>
									<span className="new-price">Rs 2500</span>
								</div>
								<ul className="benefits">
									<li>2 Steam Baths</li>
									<li>2 Massage Chair</li>
								</ul>
							</div>
							<div className="package-card fade-up">
								<h3>2 Months</h3>
								<div className="price">
									<span className="old-price">Rs 9000</span>
									<span className="new-price">Rs 4500</span>
								</div>
								<ul className="benefits">
									<li>4 Steam Baths</li>
									<li>4 Massage Chair</li>
								</ul>
							</div>
							<div className="package-card fade-up">
								<h3>3 Months</h3>
								<div className="price">
									<span className="old-price">Rs 12000</span>
									<span className="new-price">Rs 6000</span>
								</div>
								<ul className="benefits">
									<li>6 Steam Baths</li>
									<li>6 Massage Chair</li>
								</ul>
							</div>
							<div className="package-card highlight fade-up">
								<div className="badge">Most Popular</div>
								<h3>6 Months</h3>
								<div className="price">
									<span className="old-price">Rs 16000</span>
									<span className="new-price">Rs 8000</span>
								</div>
								<ul className="benefits">
									<li>12 Steam Baths</li>
									<li>12 Massage Chair</li>
								</ul>
							</div>
							<div className="package-card highlight premium fade-up">
								<div className="badge premium">Ultimate Value</div>
								<h3>12 Months</h3>
								<div className="price">
									<span className="old-price">Rs 24000</span>
									<span className="new-price">Rs 12000</span>
								</div>
								<ul className="benefits">
									<li>24 Steam Baths</li>
									<li>24 Massage Chair</li>
								</ul>
							</div>
						</div>
					</div>
				</section>

				<section className="section facilities-section" id="facilities">
					<div className="container">
						<h2 className="section-title">World-Class Facilities</h2>
					</div>
					<div className="facilities-scroller-wrapper fade-up">
						<button
							className="scroll-arrow left-arrow"
							type="button"
							onClick={onPrevFacility}
							aria-label="Scroll left">
							<svg viewBox="0 0 24 24">
								<path
									fill="currentColor"
									d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
								/>
							</svg>
						</button>
						<button
							className="scroll-arrow right-arrow"
							type="button"
							onClick={onNextFacility}
							aria-label="Scroll right">
							<svg viewBox="0 0 24 24">
								<path
									fill="currentColor"
									d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
								/>
							</svg>
						</button>
						<div className="facilities-embla" ref={emblaRef}>
							<div className="facilities-scroller" id="facilities-scroller">
								{facilities.map((facility) => (
									<div className="facility-slide" key={facility.title}>
										<div className="facility-image-card">
											<img
												src={facility.image}
												alt={facility.alt}
												className="facility-img"
											/>
											<div className="card-content">
												<h4>{facility.title}</h4>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>

				<section
					className="section transformations-preview"
					id="transformations-home">
					<div className="container">
						<div className="section-head-row fade-up">
							<div>
								<h2 className="section-title text-left">
									Transformation Hall of Fame
								</h2>
								<p className="section-subtitle">
									A few real stories from members who stayed consistent.
								</p>
							</div>
							<Link href="/transformations" className="btn secondary">
								View All
							</Link>
						</div>

						<div className="transformations-grid">
							{featuredTransformations.map((person) => (
								<article
									key={person.id}
									className="transformation-card fade-up">
									<img
										src={person.image}
										alt={`${person.name} transformation`}
									/>
									<div className="transformation-content">
										<h3>{person.name}</h3>
										<p>
											<span>{person.result}</span> in {person.duration}
										</p>
									</div>
								</article>
							))}
						</div>
					</div>
				</section>

				<section className="section timings-section" id="timings">
					<div className="container dual-col">
						<div className="timings-info fade-up">
							<h2 className="section-title text-left">Gym Timings</h2>
							<div className="timing-block">
								<h3>Monday-Saturday</h3>
								<p>5:00 AM - 10:00 PM</p>
							</div>
							<div className="timing-block">
								<h3>Sunday</h3>
								<p>6:00 AM - 12:00 PM</p>
								<p>6:00 PM - 9:30 PM</p>
							</div>
							<div className="timing-note">
								<p>
									<strong>Note:</strong> Treadmill only 15 minutes, 2 hours
									workout limit
								</p>
							</div>
						</div>

						<div className="special-offer fade-up">
							<div className="offer-pulse"></div>
							<h2 className="glow-text">50% OFF</h2>
							<p>Limited Time Offer on all Memberships</p>
						</div>
					</div>
				</section>

				<section className="section cta-section" id="cta">
					<div className="container text-center fade-up">
						<h2 className="cta-title">Start Your Fitness Journey Today</h2>
						<div className="cta-buttons">
							<Link href="/login" className="btn primary">
								Join Now
							</Link>
							<a
								href="https://wa.me/1234567890"
								target="_blank"
								rel="noreferrer"
								className="btn whatsapp">
								<svg viewBox="0 0 24 24" width="24" height="24">
									<path
										fill="currentColor"
										d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
									/>
								</svg>
								WhatsApp Us
							</a>
						</div>
					</div>
				</section>

				<section className="section map-section" id="location">
					<div className="container fade-up">
						<h2 className="section-title text-center">Our Location</h2>
						<div className="w-full h-[450px] rounded-2xl overflow-hidden shadow-2xl mt-8">
							<iframe 
								src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3807.25868765236!2d78.4867415870128!3d17.399368840919745!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb99fe9dd8f235%3A0x133e54f1adc2a40d!2sBe%20Strong%20Fitness%20%26%20Pilates%20Studio!5e0!3m2!1sen!2sin!4v1789383296165!5m2!1sen!2sin" 
								width="100%" 
								height="100%" 
								style={{ border: 0 }} 
								allowFullScreen="" 
								loading="lazy" 
								referrerPolicy="strict-origin-when-cross-origin"
							/>
						</div>
					</div>
				</section>

				<footer>
					<div className="container text-center">
						<p>&copy; 2026 BE STRONG FITNESS STUDIO. All rights reserved.</p>
					</div>
				</footer>
			</main>
		</>
	);
}
