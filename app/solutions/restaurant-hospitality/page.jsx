'use client';

import {
  ChefHat,
  UtensilsCrossed,
  Receipt,
  Clock,
  Users,
  Smartphone,
} from 'lucide-react';
import SolutionPageTemplate from '@/components/marketing/sections/SolutionPageTemplate';
import { getDemoStoreHeroByDomain } from '@/lib/marketing/demoStoreGalleryMeta';

const HERO_IMAGE = getDemoStoreHeroByDomain('demo-restaurant');

export default function RestaurantHospitalityPage() {
  return (
    <SolutionPageTemplate
      badge="Restaurant & Café"
      title={
        <>
          Restaurant POS with <br />
          <span className="text-brand-primary">kitchen display integration</span>
        </>
      }
      subtitle="Manage dine-in, takeaway, and delivery orders with digital menus, kitchen coordination, and table management in one hospitality platform."
      heroImage={HERO_IMAGE}
      heroImageAlt="Restaurant POS and kitchen display system"

      problemStatement="Restaurants need more than a cash register"
      painPoints={[
        'Paper tickets get lost between front desk and kitchen',
        'No real-time visibility of table occupancy and order status',
        'Separate systems for dine-in, takeaway, and delivery',
        'Kitchen staff cannot prioritize orders or manage prep time',
        'Daily sales reconciliation takes hours of manual work',
        'Cannot track ingredient costs and menu profitability',
      ]}

      solutionTitle="Complete restaurant operations platform"
      solutionDescription="TENVO connects your front desk, kitchen, and delivery workflows. Digital orders flow instantly to kitchen displays, staff track table status in real-time, and daily reports show exactly what sold and what's profitable."

      features={[
        {
          icon: ChefHat,
          title: 'Kitchen Display System',
          description:
            'Orders appear on kitchen screens instantly. Chefs mark items complete, and front desk sees live prep status.',
        },
        {
          icon: UtensilsCrossed,
          title: 'Table Management',
          description:
            'Visual floor plan, table assignments, merge tables, split bills, and track dine-in vs takeaway orders separately.',
        },
        {
          icon: Receipt,
          title: 'Digital Menu & POS',
          description:
            'Touch-optimized menu with modifiers, combo deals, and quick order entry. Print KOTs and customer receipts.',
        },
        {
          icon: Clock,
          title: 'Order Mode Tracking',
          description:
            'Separate order flows for dine-in, takeaway, and delivery with mode-specific pricing and preparation instructions.',
        },
        {
          icon: Smartphone,
          title: 'Online Ordering',
          description:
            'Branded online menu for takeaway and delivery. Orders flow into the same kitchen queue as walk-ins.',
        },
        {
          icon: Users,
          title: 'Staff & Shift Management',
          description:
            'Track waiter performance, cashier shifts, and kitchen efficiency. Daily sales reports per shift and staff member.',
        },
      ]}

      demoStoreName="Restaurant"
      demoStoreUrl="/store/demo-restaurant"
      demoStoreDescription="Try our full-featured restaurant demo with digital menu, table management, and order tracking."

      recommendedPlan={{
        name: 'Business',
        tagline: 'For restaurants with kitchen display needs',
        price: 'PKR 39,500',
      }}
      planFeatures={[
        'Kitchen Display System (KDS)',
        'Table management and floor plan',
        'Order mode tracking (dine-in/takeaway/delivery)',
        'Online menu and ordering',
        'Staff and shift management',
        'Recipe costing and profitability',
        'Daily sales and kitchen performance reports',
        'Multi-location support',
      ]}

      successMetrics={[
        { value: 'Zero', label: 'Lost tickets' },
        { value: '25%', label: 'Faster table turnover' },
        { value: '30%', label: 'More online orders' },
        { value: '5 mins', label: 'Daily reconciliation' },
      ]}
    />
  );
}
