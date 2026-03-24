import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(currentPage, 0), totalPages - 1);

  if (totalPages <= 1) {
    return null;
  }

  const handleFirst = () => onPageChange(0);
  const handlePrevious = () => onPageChange(Math.max(0, safePage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages - 1, safePage + 1));
  const handleLast = () => onPageChange(totalPages - 1);

  const canPrevious = safePage > 0;
  const canNext = safePage < totalPages - 1;

  return (
    <div className="flex items-center justify-between px-8 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold">
      <div className="text-gray-500 dark:text-gray-400">
        Showing{' '}
        <span className="font-black text-gray-800 dark:text-white">
          {Math.min(safePage * itemsPerPage + 1, totalItems)}
        </span>{' '}
        to{' '}
        <span className="font-black text-gray-800 dark:text-white">
          {Math.min((safePage + 1) * itemsPerPage, totalItems)}
        </span>{' '}
        of{' '}
        <span className="font-black text-gray-800 dark:text-white">
          {totalItems}
        </span>{' '}
        Results
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="First page"
          onClick={handleFirst}
          disabled={!canPrevious}
          className="p-2.5 rounded-lg text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-5 h-5" />
        </button>
        <button
          aria-label="Previous page"
          onClick={handlePrevious}
          disabled={!canPrevious}
          className="p-2.5 rounded-lg text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-gray-500 dark:text-gray-400 px-4">
          Page{' '}
          <span className="font-black text-gray-800 dark:text-white">
            {safePage + 1}
          </span>{' '}
          of{' '}
          <span className="font-black text-gray-800 dark:text-white">
            {totalPages}
          </span>
        </span>
        <button
          aria-label="Next page"
          onClick={handleNext}
          disabled={!canNext}
          className="p-2.5 rounded-lg text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          aria-label="Last page"
          onClick={handleLast}
          disabled={!canNext}
          className="p-2.5 rounded-lg text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
