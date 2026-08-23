"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import Image from "next/image";

export default function CTASection() {
  const slides = [
    "/1.png",
    "/2.png",
    "/3.png",
    "/4.png",
  ];

  const [current, setCurrent] = useState(0);

  return (
    <section id="cta" className="px-5 py-16 md:py-28">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl md:text-4xl">
          Your Progress deserves to be{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-teal-500 bg-clip-text text-transparent">
            seen.
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-white/70 md:text-base">
          LiftLog turns your training into measurable progress - so you can see
          exactly how far you&apos;ve come.
        </p>
      </div>

      <Carousel
        opts={{ align: "center", loop: true }}
        setApi={(api) => {
          api?.on("select", () => setCurrent(api.selectedScrollSnap()));
        }}
        className="max-w-4xl mx-auto relative"
      >
        <CarouselContent className="-ml-4">
          {slides.map((src, index) => {
            const isActive = index === current;

            return (
              <CarouselItem
                key={index}
                className="pl-4 basis-[100%] sm:basis-[65%] md:basis-[75%]"
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1 : 0.9,
                    filter: isActive ? "blur(0px)" : "blur(4px)",
                    opacity: isActive ? 1 : 0.6,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25,
                  }}
                  className="overflow-hidden rounded-xl"
                >
                  <Image
                    src={src}
                    alt=""
                    width={800}
                    height={600}
                    className="h-56 w-full object-contain sm:h-72 md:h-[350px]"
                  />
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <CarouselPrevious className="hidden sm:flex"/>
        <CarouselNext className="hidden sm:flex"/>
      </Carousel>
    </section>
  );
}
