import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaxCalculationsWidget } from '../TaxCalculationsWidget';

// Mock the language context
jest.mock('@/lib/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' })
}));

// Mock the currency formatter
jest.mock('@/lib/currency', () => ({
  formatCurrency: (amount, currency) => `${currency} ${amount.toLocaleString()}`
}));

// Mock translations
jest.mock('@/lib/translations', () => ({
  translations: {
    en: {
      tax_calculations: 'Tax Calculations',
      pst_fst_calculations: 'PST/FST calculations',
      taxable_sales: 'Taxable Sales',
      pst: 'PST',
      fst: 'FST',
      total_tax_liability: 'Total Tax Liability',
      paid: 'Paid',
      pending: 'Pending',
      view_detailed_calculations: 'View Detailed Calculations',
      last_updated: 'Last updated',
      no_tax_data: 'No tax data available'
    }
  }
}));

const mockTaxData = {
  totalSales: 2450000,
  taxableAmount: 2450000,
  pst: {
    rate: 17,
    amount: 416500
  },
  fst: {
    rate: 1,
    amount: 24500
  },
  totalTax: 441000,
  taxPaid: 400000,
  taxPending: 41000,
  nextFilingDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
};

describe('TaxCalculationsWidget', () => {
  it('should render loading state when loading', () => {
    render(
      <TaxCalculationsWidget businessId="test-business" />
    );
    
    // Check for loading skeleton
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should render tax calculations with provided data', () => {
    render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={mockTaxData}
        currency="PKR"
      />
    );
    
    // Check for widget title
    expect(screen.getByText('Tax Calculations')).toBeInTheDocument();
    expect(screen.getByText('PST/FST calculations')).toBeInTheDocument();
    
    // Check for taxable sales
    expect(screen.getByText('Taxable Sales')).toBeInTheDocument();
    expect(screen.getByText('PKR 2,450,000')).toBeInTheDocument();
    
    // Check for PST
    expect(screen.getByText(/PST/)).toBeInTheDocument();
    expect(screen.getByText('PKR 416,500')).toBeInTheDocument();
    
    // Check for FST
    expect(screen.getByText(/FST/)).toBeInTheDocument();
    expect(screen.getByText('PKR 24,500')).toBeInTheDocument();
    
    // Check for total tax liability
    expect(screen.getByText('Total Tax Liability')).toBeInTheDocument();
    expect(screen.getByText('PKR 441,000')).toBeInTheDocument();
    
    // Check for paid and pending amounts
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('PKR 400,000')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('PKR 41,000')).toBeInTheDocument();
  });

  it('should display correct PST and FST rates', () => {
    render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={mockTaxData}
        currency="PKR"
      />
    );
    
    // Check for PST rate
    expect(screen.getByText(/PST.*17%/)).toBeInTheDocument();
    
    // Check for FST rate
    expect(screen.getByText(/FST.*1%/)).toBeInTheDocument();
  });

  it('should call onViewDetails when quick action is clicked', () => {
    const mockOnViewDetails = jest.fn();
    
    render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={mockTaxData}
        currency="PKR"
        onViewDetails={mockOnViewDetails}
      />
    );
    
    // Click the view details button
    const viewDetailsButton = screen.getByText('View Detailed Calculations ->');
    fireEvent.click(viewDetailsButton);
    
    // Check if callback was called with correct action
    expect(mockOnViewDetails).toHaveBeenCalledWith('view-tax-details');
  });

  it('should render empty state when no data is provided', async () => {
    render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={null}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('No tax data available')).toBeInTheDocument();
    });
  });

  it('should display last updated timestamp', () => {
    render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={mockTaxData}
        currency="PKR"
      />
    );
    
    // Check for last updated text
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('should use correct currency formatting', () => {
    render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={mockTaxData}
        currency="USD"
      />
    );
    
    // Check that USD is used instead of PKR
    expect(screen.getByText('USD 2,450,000')).toBeInTheDocument();
  });

  it('should render with glass-card styling', () => {
    const { container } = render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={mockTaxData}
        currency="PKR"
      />
    );
    
    // Check for glass-card class
    const card = container.querySelector('.glass-card');
    expect(card).toBeInTheDocument();
  });

  it('should display calculator icon', () => {
    const { container } = render(
      <TaxCalculationsWidget 
        businessId="test-business"
        data={mockTaxData}
        currency="PKR"
      />
    );
    
    // Check for icon container with purple styling
    const iconContainer = container.querySelector('.bg-wine-50');
    expect(iconContainer).toBeInTheDocument();
  });
});

