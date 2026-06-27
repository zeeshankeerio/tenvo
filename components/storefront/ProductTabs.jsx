'use client';

import { useState } from 'react';
import { Truck, RotateCcw, Shield } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

const TABS = [
  { key: 'description', label: 'Description' },
  { key: 'specs', label: 'Specifications' },
  { key: 'shipping', label: 'Shipping & Returns' },
];

export function ProductTabs({ product, freeShippingThreshold = 2000, returnPolicyDays = 7, currency = 'PKR' }) {
  const [activeTab, setActiveTab] = useState('description');

  return (
    <div className="p-6 sm:p-8">
      {/* Tab List */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Description */}
      {activeTab === 'description' && (
        <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
          {product.description ? (
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          ) : (
            <p className="text-gray-400 italic">No description available for this product.</p>
          )}
        </div>
      )}

      {/* Specifications */}
      {activeTab === 'specs' && (
        <div>
          {product.specifications && Object.keys(product.specifications).length > 0 ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                  <dt className="text-sm text-gray-500 capitalize w-1/3 flex-shrink-0">{key}</dt>
                  <dd className="text-sm font-medium text-gray-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-gray-400 italic text-sm">No specifications available.</p>
          )}
        </div>
      )}

      {/* Shipping & Returns */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Shipping</h4>
              <p className="text-sm text-gray-600">
                Standard delivery: 3-5 business days. Express delivery: 1-2 business days.
                Free shipping on orders over {formatCurrency(freeShippingThreshold, currency)}.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Returns</h4>
              <p className="text-sm text-gray-600">
                We accept returns within {returnPolicyDays} days of delivery. Items must be unused and in original packaging.
                Contact us to initiate a return.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Secure Payment</h4>
              <p className="text-sm text-gray-600">
                All transactions are encrypted and secure. We accept credit/debit cards, COD, JazzCash, and EasyPaisa.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
