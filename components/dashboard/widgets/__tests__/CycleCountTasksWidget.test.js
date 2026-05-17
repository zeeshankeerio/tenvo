import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CycleCountTasksWidget } from '../CycleCountTasksWidget';

// Mock the language context
jest.mock('@/lib/context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' })
}));

// Mock translations
jest.mock('@/lib/translations', () => ({
  translations: {
    en: {
      cycle_count_tasks: 'Cycle Count Tasks',
      pending_cycle_counts: 'Pending cycle counts',
      pending: 'Pending',
      in_progress: 'In Progress',
      today: 'Today',
      products: 'products',
      due: 'Due',
      view_all_tasks: 'View All Tasks',
      last_updated: 'Last updated',
      no_cycle_count_tasks: 'No cycle count tasks available',
      tomorrow: 'Tomorrow',
      overdue: 'overdue'
    }
  }
}));

describe('CycleCountTasksWidget', () => {
  const mockData = {
    pendingCount: 3,
    inProgressCount: 1,
    completedToday: 2,
    tasks: [
      {
        id: 1,
        name: 'Monthly Count - Zone A',
        scheduleId: 'cc-001',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        productCount: 45,
        completedCount: 0,
        assignedTo: 'user-123',
        status: 'pending'
      },
      {
        id: 2,
        name: 'Quarterly Count - Electronics',
        scheduleId: 'cc-002',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        productCount: 120,
        completedCount: 35,
        assignedTo: 'user-123',
        status: 'in_progress'
      }
    ]
  };

  it('should render loading state initially', () => {
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
      />
    );
    
    // Check for loading skeleton
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should display cycle count tasks when data is provided', () => {
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={mockData}
      />
    );
    
    // Check header
    expect(screen.getByText('Cycle Count Tasks')).toBeInTheDocument();
    expect(screen.getByText('Pending cycle counts')).toBeInTheDocument();
    
    // Check summary counts
    expect(screen.getByText('3')).toBeInTheDocument(); // pending
    expect(screen.getByText('1')).toBeInTheDocument(); // in progress
    expect(screen.getByText('2')).toBeInTheDocument(); // completed today
    
    // Check task names
    expect(screen.getByText('Monthly Count - Zone A')).toBeInTheDocument();
    expect(screen.getByText('Quarterly Count - Electronics')).toBeInTheDocument();
  });

  it('should display task priorities correctly', () => {
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={mockData}
      />
    );
    
    // Check priority badges
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('should show progress bar for in-progress tasks', () => {
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={mockData}
      />
    );
    
    // Check for progress percentage (35/120 = 29%)
    expect(screen.getByText('29%')).toBeInTheDocument();
  });

  it('should call onStartCycleCount when task is clicked', () => {
    const mockOnStartCycleCount = jest.fn();
    
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={mockData}
        onStartCycleCount={mockOnStartCycleCount}
      />
    );
    
    // Click on first task
    const firstTask = screen.getByText('Monthly Count - Zone A');
    fireEvent.click(firstTask.closest('div[class*="cursor-pointer"]'));
    
    expect(mockOnStartCycleCount).toHaveBeenCalledWith('cc-001');
  });

  it('should call onViewAllTasks when view all button is clicked', () => {
    const mockOnViewAllTasks = jest.fn();
    
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={mockData}
        onViewAllTasks={mockOnViewAllTasks}
      />
    );
    
    // Click view all tasks button
    const viewAllButton = screen.getByText('View All Tasks ->');
    fireEvent.click(viewAllButton);
    
    expect(mockOnViewAllTasks).toHaveBeenCalled();
  });

  it('should display empty state when no data is available', () => {
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={{ pendingCount: 0, inProgressCount: 0, completedToday: 0, tasks: [] }}
      />
    );
    
    // Should still show the widget structure but with empty task list
    expect(screen.getByText('Cycle Count Tasks')).toBeInTheDocument();
  });

  it('should format due dates correctly', () => {
    const todayTask = {
      ...mockData,
      tasks: [
        {
          id: 1,
          name: 'Today Task',
          scheduleId: 'cc-today',
          dueDate: new Date(),
          priority: 'high',
          productCount: 10,
          completedCount: 0,
          assignedTo: 'user-123',
          status: 'pending'
        }
      ]
    };
    
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={todayTask}
      />
    );
    
    // Check for "Today" text
    expect(screen.getByText(/Today/)).toBeInTheDocument();
  });

  it('should display product count for each task', () => {
    render(
      <CycleCountTasksWidget 
        businessId="test-business"
        userId="test-user"
        data={mockData}
      />
    );
    
    // Check product counts
    expect(screen.getByText('45 products')).toBeInTheDocument();
    expect(screen.getByText('120 products')).toBeInTheDocument();
  });
});
