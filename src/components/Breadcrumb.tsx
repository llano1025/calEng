import React from 'react';
import { Icons } from './Icons';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <div className="h-4 w-4 text-gray-300">
              <Icons.ChevronRight />
            </div>
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className={`hover:text-gray-700 transition-colors duration-200 ${
                item.isActive ? 'text-blue-600 font-medium' : ''
              }`}
            >
              {item.label}
            </button>
          ) : (
            <span
              className={`${
                item.isActive ? 'text-gray-900 font-medium' : ''
              }`}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;