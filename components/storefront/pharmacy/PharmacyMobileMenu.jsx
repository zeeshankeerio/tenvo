'use client';

import Link from 'next/link';
import {
  X, FileUp, Package, HelpCircle, Truck, Phone, ShoppingBag, Home, LayoutGrid,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCart } from '@/lib/hooks/storefront/useCart';

/**
 * Pharmacy app-style mobile drawer.
 */
export function PharmacyMobileMenu({
  isOpen,
  onClose,
  businessDomain,
  storeRoot,
  displayName,
  categoryItems,
  accent,
  contact,
}) {
  const { cart } = useCart();
  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  const quickActions = [
    { label: 'Home', href: storeRoot, icon: Home },
    { label: 'Shop', href: `${storeRoot}/products`, icon: LayoutGrid },
    { label: 'Upload Rx', href: `${storeRoot}/contact?prescription=1`, icon: FileUp, highlight: true },
    { label: 'Cart', href: `${storeRoot}/cart`, icon: ShoppingBag, badge: cartCount },
    { label: 'Orders', href: `${storeRoot}/orders`, icon: Package },
    { label: 'Help', href: `${storeRoot}/faqs`, icon: HelpCircle },
  ];

  const supportLinks = [
    { label: 'Shipping', href: `${storeRoot}/shipping`, icon: Truck },
    { label: 'Contact', href: `${storeRoot}/contact`, icon: Phone },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="flex w-[min(88vw,360px)] flex-col p-0">
        <SheetHeader className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-emerald-900">{displayName}</SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 hover:bg-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 p-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                onClick={onClose}
                className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-100 bg-white px-2 py-3 text-center shadow-sm active:scale-[0.98]"
                style={action.highlight ? { borderColor: `${accent}40`, backgroundColor: `${accent}12` } : undefined}
              >
                <action.icon
                  className="h-5 w-5"
                  style={{ color: action.highlight ? accent : '#15803d' }}
                  aria-hidden
                />
                <span className="text-[10px] font-bold leading-tight text-slate-800">{action.label}</span>
                {action.badge > 0 ? (
                  <span
                    className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {action.badge > 99 ? '99+' : action.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</p>
            <div className="space-y-0.5">
              <Link
                href={`${storeRoot}/products`}
                onClick={onClose}
                className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 active:bg-emerald-50"
              >
                Shop all products
              </Link>
              {categoryItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 active:bg-emerald-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 px-4 py-3">
            {supportLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 active:bg-emerald-50"
              >
                <link.icon className="h-4 w-4 text-emerald-700" aria-hidden />
                {link.label}
              </Link>
            ))}
          </div>

          {contact.phone ? (
            <div className="border-t border-slate-100 px-4 py-4">
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                <Phone className="h-4 w-4" aria-hidden />
                Call pharmacist
              </a>
            </div>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
