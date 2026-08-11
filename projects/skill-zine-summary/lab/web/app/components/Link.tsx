import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/**
 * Use a normal document navigation for research routes. Vinext's client Link
 * prefetch currently fails in the hosted worker and can swallow clicks, while
 * direct route requests remain healthy. A plain anchor is also the correct
 * primitive for the GitHub Pages static export.
 */
export default function Link({ children, href, ...props }: LinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
