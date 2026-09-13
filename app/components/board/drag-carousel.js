"use client";

import { useRef, useState } from "react";

export default function DragCarousel({ children, className = "" }) {
	const sliderRef = useRef(null);
	const [isDown, setIsDown] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [isDragging, setIsDragging] = useState(false);

	const handleMouseDown = (e) => {
		setIsDown(true);
		setIsDragging(false);
		if (sliderRef.current) {
			sliderRef.current.classList.add("cursor-grabbing");
			// Disable snap when dragging so it feels fluid
			sliderRef.current.classList.remove("snap-x", "snap-mandatory");
			setStartX(e.pageX - sliderRef.current.offsetLeft);
			setScrollLeft(sliderRef.current.scrollLeft);
		}
	};

	const handleMouseLeave = () => {
		setIsDown(false);
		if (sliderRef.current) {
			sliderRef.current.classList.remove("cursor-grabbing");
			sliderRef.current.classList.add("snap-x", "snap-mandatory");
		}
	};

	const handleMouseUp = () => {
		setIsDown(false);
		if (sliderRef.current) {
			sliderRef.current.classList.remove("cursor-grabbing");
			sliderRef.current.classList.add("snap-x", "snap-mandatory");
		}
		// Reset dragging state after a short delay so click handlers can check it
		setTimeout(() => setIsDragging(false), 50);
	};

	const handleMouseMove = (e) => {
		if (!isDown) return;
		e.preventDefault();
		if (sliderRef.current) {
			const x = e.pageX - sliderRef.current.offsetLeft;
			const walk = (x - startX) * 2; // scroll-fast multiplier
			if (Math.abs(x - startX) > 5) setIsDragging(true);
			sliderRef.current.scrollLeft = scrollLeft - walk;
		}
	};

	const handleClickCapture = (e) => {
		if (isDragging) {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	return (
		<div
			ref={sliderRef}
			className={`flex overflow-x-auto snap-x snap-mandatory hide-scrollbar ${className}`}
			onMouseDown={handleMouseDown}
			onMouseLeave={handleMouseLeave}
			onMouseUp={handleMouseUp}
			onMouseMove={handleMouseMove}
			onClickCapture={handleClickCapture}
			style={{ WebkitOverflowScrolling: "touch", cursor: isDown ? "grabbing" : "grab" }}
		>
			{children}
		</div>
	);
}
