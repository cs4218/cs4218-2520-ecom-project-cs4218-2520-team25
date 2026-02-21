import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Users from './Users';

jest.mock('../../components/Layout', () => ({ children, title }) => (
  <div data-testid="mock-layout" title={title}>
    {children}
  </div>
));

jest.mock('../../components/AdminMenu', () => () => (
  <div data-testid="mock-admin-menu">Admin Menu</div>
));

describe('Users Admin Component', () => {
  
  test('should render the Users dashboard with Layout and AdminMenu', () => {
    // --- Arrange ---
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // --- Act ---
    const layout = screen.getByTestId('mock-layout');
    const adminMenu = screen.getByTestId('mock-admin-menu');
    const heading = screen.getByRole('heading', { name: /all users/i });

    // --- Assert ---
    expect(layout).toBeInTheDocument();
    expect(adminMenu).toBeInTheDocument();
    expect(heading).toBeInTheDocument();
  });

  test('should pass the correct title to the Layout component', () => {
    // --- Arrange & Act ---
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

    // --- Assert ---
    const layout = screen.getByTestId('mock-layout');
    expect(layout).toHaveAttribute('title', 'Dashboard - All Users');
  });
});