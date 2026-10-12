"use client";

import { domains } from "@/components/landing/domains";
import Marquee from "@/components/magicui/marquee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader } from "lucide-react";
import { motion } from "motion/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const tiles = domains.map((domain) => ({
  name: domain.name,
  icon: domain.icon,
}));

const rows = [
  { reverse: true, duration: "20s", offset: 0 },
  { reverse: false, duration: "30s", offset: 3 },
  { reverse: true, duration: "24s", offset: 6 },
  { reverse: false, duration: "34s", offset: 1 },
  { reverse: true, duration: "28s", offset: 5 },
];

function rotate<T>(items: T[], offset: number): T[] {
  return [...items.slice(offset), ...items.slice(0, offset)];
}

const Tile = ({ name, icon: Icon }: (typeof tiles)[number]) => (
  <div
    title={name}
    className="card-glass relative flex size-20 items-center justify-center text-brand-blue/80"
  >
    <Icon className="size-8" aria-hidden />
    <span className="sr-only">{name}</span>
  </div>
);

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    // TODO: brancher sur le service de liste d'attente (API / newsletter).
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setEmail("");
    toast.success("Tu es sur la liste.", {
      description: "Le System te contactera à l'ouverture de l'accès anticipé.",
    });
  };

  return (
    <section id="waitlist" className="scroll-mt-24">
      <div className="py-14">
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
          {rows.map((row, idx) => (
            <Marquee
              key={idx}
              reverse={row.reverse}
              style={{ "--duration": row.duration } as React.CSSProperties}
              repeat={5}
            >
              {rotate(tiles, row.offset).map((tile) => (
                <Tile key={tile.name} {...tile} />
              ))}
            </Marquee>
          ))}

          <div className="absolute z-10 w-full max-w-xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="card-glass p-8 text-center shadow-2xl md:p-10"
            >
              <p className="text-xs tracking-[0.4em] text-brand-blue">ACCÈS ANTICIPÉ</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight lg:text-4xl">
                Rejoins la liste d’attente.
              </h2>
              <p className="mt-3 text-balance text-muted-foreground">
                Les premiers joueurs ouvriront le System. Pas de spam : un seul
                message, le jour de l’ouverture.
              </p>

              <form
                onSubmit={onSubmit}
                className="mt-6 flex flex-col gap-3 sm:flex-row"
                aria-label="Inscription à la liste d'attente"
              >
                <label htmlFor="waitlist-email" className="sr-only">
                  Adresse e-mail
                </label>
                <Input
                  id="waitlist-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 flex-1 rounded-xl bg-black/30"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "group h-11 gap-2 rounded-xl px-5 font-semibold",
                    "transition-all duration-300 hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="size-4 animate-spin" aria-hidden />
                      Inscription…
                    </>
                  ) : (
                    <>
                      Rejoindre la liste d’attente
                      <ArrowRight
                        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden
                      />
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          </div>

          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-b from-transparent to-background to-70%" />
        </div>
      </div>
    </section>
  );
}
