// Kailashwaran, A0253385Y; Entire file

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import UserMenu from "./UserMenu";

describe("UserMenu Component", () => {
  
  // Proper render
  test("should render the dashboard heading", () => {
    // --- Arrange ---
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    // --- Act & Assert ---
    const heading = screen.getByRole("heading", { name: /dashboard/i });
    expect(heading).toBeInTheDocument();
  });

  test("should have a link to the profile page with correct attributes", () => {
    // --- Arrange ---
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    // --- Act ---
    const profileLink = screen.getByRole("link", { name: /profile/i });

    // --- Assert ---
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
    expect(profileLink).toHaveClass("list-group-item");
  });

  test("should have a link to the orders page", () => {
    // --- Arrange ---
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );

    // --- Act ---
    const ordersLink = screen.getByRole("link", { name: /orders/i });

    // --- Assert ---
    expect(ordersLink).toBeInTheDocument();
    expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
  });
});