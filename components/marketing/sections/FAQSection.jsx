'use client';

import { useState, useEffect, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  MARKETING_CONTAINER,
  MARKETING_CONTAINER_NARROW,
  MARKETING_H2,
  MARKETING_LEAD,
  MARKETING_SECTION,
} from '@/lib/utils/marketingLayout';

/**
 * FAQSection Component
 * 
 * Displays frequently asked questions in an accordion format.
 * Supports category filtering and search functionality.
 * 
 * @param {Object} props
 * @param {string} props.title - Section title
 * @param {string} props.subtitle - Section subtitle
 * @param {Array} props.faqs - Array of FAQ objects with id, question, answer, category
 * @param {boolean} props.showSearch - Show search functionality
 * @param {boolean} props.showCategories - Show category filters
 */
export default function FAQSection({
  title,
  subtitle,
  faqs = [],
  showSearch = true,
  showCategories = true
}) {
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(faqs.map(faq => faq.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [faqs]);

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    let filtered = faqs;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    return filtered;
  }, [faqs, searchQuery, selectedCategory]);

  // Toggle FAQ expansion
  const toggleFAQ = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className={cn(MARKETING_SECTION, 'bg-white')}>
      <div className={MARKETING_CONTAINER}>
        <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-12">
          <h2 className={cn(MARKETING_H2, 'mb-3 sm:mb-4')}>{title}</h2>
          {subtitle ? <p className={MARKETING_LEAD}>{subtitle}</p> : null}
        </div>

        {showSearch ? (
          <div className="mx-auto mb-6 max-w-2xl sm:mb-8">
            <div className="relative">
              <LucideIcons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 sm:left-4 sm:h-5 sm:w-5" />
              <Input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl border-2 border-neutral-200 py-3 pl-10 text-base focus:border-brand-primary sm:py-4 sm:pl-12 sm:text-lg"
              />
            </div>
          </div>
        ) : null}

        {showCategories && categories.length > 0 ? (
          <div className="mb-8 flex flex-wrap justify-center gap-2 sm:mb-12 sm:gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === null
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              All Questions
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-brand-primary text-white shadow-lg'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        ) : null}

        {/* FAQs accordion */}
        {filteredFAQs.length > 0 ? (
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredFAQs.map((faq, index) => {
              const isExpanded = expandedId === faq.id;
              
              return (
                <div
                  key={faq.id}
                  className={`bg-neutral-50 rounded-xl border-2 border-neutral-200 hover:border-brand-300 transition-all duration-300 ${
                    mounted ? 'animate-fade-in-up' : 'opacity-0'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Question button */}
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-neutral-900 mb-1">
                        {faq.question}
                      </h3>
                      {faq.category && (
                        <span className="inline-block px-2 py-1 text-xs font-medium text-brand-primary-dark bg-brand-50 rounded">
                          {faq.category}
                        </span>
                      )}
                    </div>
                    
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}>
                      <LucideIcons.ChevronDown className="w-5 h-5 text-brand-primary" />
                    </div>
                  </button>

                  {/* Answer */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'max-h-96' : 'max-h-0'
                    }`}
                  >
                    <div className="px-6 pb-6 pt-2">
                      <p className="text-neutral-700 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // No results message
          <div className="text-center py-16">
            <LucideIcons.HelpCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              No FAQs found
            </h3>
            <p className="text-neutral-600 mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
              }}
              className="px-6 py-3 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-dark transition-colors duration-300"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-neutral-600 mb-4">
            Still have questions?
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 text-brand-primary font-semibold hover:gap-3 transition-all duration-300"
          >
            <span>Contact our support team</span>
            <LucideIcons.ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
