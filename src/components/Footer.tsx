import Image from "next/image";
import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const footerColumns: FooterColumn[] = [
  {
    title: "Featured",
    links: [
      { label: "Air Force 1", href: "#" },
      { label: "Huarache", href: "#" },
      { label: "Air Max 90", href: "#" },
      { label: "Air Max 95", href: "#" },
    ],
  },
  {
    title: "Shoes",
    links: [
      { label: "All Shoes", href: "#" },
      { label: "Custom Shoes", href: "#" },
      { label: "Jordan Shoes", href: "#" },
      { label: "Running Shoes", href: "#" },
    ],
  },
  {
    title: "Clothing",
    links: [
      { label: "All Clothing", href: "#" },
      { label: "Modest Wear", href: "#" },
      { label: "Hoodies & Pullovers", href: "#" },
      { label: "Shirts & Tops", href: "#" },
    ],
  },
  {
    title: "Kids'",
    links: [
      { label: "Infant & Toddler Shoes", href: "#" },
      { label: "Kids' Shoes", href: "#" },
      { label: "Kids' Jordan Shoes", href: "#" },
      { label: "Kids' Basketball Shoes", href: "#" },
    ],
  },
];

const socialLinks = [
  { icon: "/x.svg", label: "X (Twitter)", href: "#" },
  { icon: "/facebook.svg", label: "Facebook", href: "#" },
  { icon: "/instagram.svg", label: "Instagram", href: "#" },
];

const bottomLinks: FooterLink[] = [
  { label: "Guides", href: "#" },
  { label: "Terms of Sale", href: "#" },
  { label: "Terms of Use", href: "#" },
  { label: "Meaw Privacy Policy", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-dark-900 text-light-100">
      {/* Main footer content */}
      <div className="mx-auto max-w-[1440px] px-6 pt-10 pb-8 lg:px-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* Logo */}
          <div className="shrink-0">
            <Link href="/" aria-label="Home">
              <Image
                src="/logocat.png"
                alt="Meaw"
                width={80}
                height={29}
                className="h-auto w-[60px] lg:w-[80px]"
              />
            </Link>
          </div>

          {/* Link columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h4 className="text-caption font-[var(--text-caption--font-weight)] leading-[var(--text-caption--line-height)] uppercase text-light-100 mb-4">
                  {column.title}
                </h4>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-footnote font-[var(--text-footnote--font-weight)] leading-[var(--text-footnote--line-height)] text-dark-500 transition-colors hover:text-light-100"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Social icons */}
          <div className="flex items-start gap-3 lg:ml-auto">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-dark-700 transition-colors hover:border-light-100"
              >
                <Image
                  src={social.icon}
                  alt={social.label}
                  width={18}
                  height={18}
                  className="invert"
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-dark-700">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row lg:px-12">
          {/* Location & copyright */}
          <p className="text-footnote font-[var(--text-footnote--font-weight)] leading-[var(--text-footnote--line-height)] text-dark-500">
            <span className="mr-1">📍</span>
            ThaiLand &nbsp;&copy; 2025 Meaw, Inc. All Rights Reserved
          </p>

          {/* Legal links */}
          <ul className="flex flex-wrap items-center gap-4 sm:gap-6">
            {bottomLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-footnote font-[var(--text-footnote--font-weight)] leading-[var(--text-footnote--line-height)] text-dark-500 transition-colors hover:text-light-100"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
