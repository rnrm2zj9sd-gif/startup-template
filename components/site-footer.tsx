import { DiscordLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";

const footerNavs = [
  {
    label: "Produit",
    items: [
      {
        href: "#fonctionnalites",
        name: "Fonctionnalités",
      },
      {
        href: "#domaines",
        name: "Domaines",
      },
      {
        href: "#waitlist",
        name: "Liste d'attente",
      },
    ],
  },

  {
    label: "Communauté",
    items: [
      {
        href: "#",
        name: "Discord",
      },
      {
        href: "#",
        name: "X (Twitter)",
      },
      {
        href: "mailto:contact@themilion.shop",
        name: "E-mail",
      },
    ],
  },
  {
    label: "Légal",
    items: [
      {
        href: "/terms",
        name: "Conditions d'utilisation",
      },

      {
        href: "/privacy",
        name: "Confidentialité",
      },
    ],
  },
];

const footerSocials = [
  {
    href: "#",
    name: "Discord",
    icon: <DiscordLogoIcon className="h-4 w-4" />,
  },
  {
    href: "#",
    name: "X (Twitter)",
    icon: <TwitterLogoIcon className="h-4 w-4" />,
  },
];

export function SiteFooter() {
  return (
    <footer>
      <div className="mx-auto w-full max-w-screen-xl xl:pb-2">
        <div className="md:flex md:justify-between px-8 p-4 py-16 sm:pb-16 gap-4">
          <div className="mb-12 flex-col flex gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-lg border border-brand-blue/40 bg-brand-blue/15"
              >
                <span className="size-2 rounded-full bg-brand-blue shadow-[0_0_12px_var(--color-one)]" />
              </span>
              <span className="self-center whitespace-nowrap text-xl font-semibold tracking-[0.2em] dark:text-white">
                THEMILION SYSTEM
              </span>
            </Link>
            <p className="max-w-xs text-muted-foreground">
              Le System personnel qui transforme ta vie en RPG.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:gap-10 sm:grid-cols-3">
            {footerNavs.map((nav) => (
              <div key={nav.label}>
                <h2 className="mb-6 text-sm tracking-tighter font-medium text-gray-900 uppercase dark:text-white">
                  {nav.label}
                </h2>
                <ul className="gap-2 grid">
                  {nav.items.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="cursor-pointer text-gray-400 hover:text-gray-200 duration-200 font-[450] text-sm"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex sm:items-center sm:justify-between rounded-md border-neutral-700/20 py-4 px-8 gap-2">
          <div className="flex space-x-5 sm:justify-center sm:mt-0">
            {footerSocials.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-600 fill-gray-500 hover:fill-gray-900 dark:hover:fill-gray-600"
              >
                {social.icon}
                <span className="sr-only">{social.name}</span>
              </Link>
            ))}
          </div>
          <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
            © {new Date().getFullYear()}{" "}
            <Link href="/" className="cursor-pointer">
              THEMILION SYSTEM
            </Link>
            . Tous droits réservés.
          </span>
        </div>
      </div>
      {/*   <SiteBanner /> */}
    </footer>
  );
}
