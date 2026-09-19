import React from 'react';
import { twMerge } from 'tailwind-merge';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav className={twMerge("flex items-center space-x-2 text-sm text-[#9CA3AF]", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="opacity-50">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-[#F4F1EA] transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-[#F4F1EA] font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
