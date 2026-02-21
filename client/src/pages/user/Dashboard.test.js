import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import Dashboard from "./Dashboard";
import { useAuth } from "../../context/auth";

jest.mock("./../../components/UserMenu", () => () => (
  <div data-testid="user-menu">User Menu</div>
));

describe("Dashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render user information from auth context correctly", () => {
    // --- Arrange ---
    const mockUser = {
      name: "Kailash",
      email: "kailash@test.com",
      address: "123 NUS Street, Singapore",
    };
    useAuth.mockReturnValue([{ user: mockUser }]);

    // --- Act ---
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // --- Assert ---
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    expect(screen.getByText(mockUser.address)).toBeInTheDocument();
  });

  test("should handle null user state gracefully", () => {
    // --- Arrange ---
    useAuth.mockReturnValue([{ user: null }]);

    // --- Act ---
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // --- Assert ---
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 3 }).filter(h => h.textContent.trim() !== "")).toEqual([]);
  });

  test("should render the UserMenu component", () => {
    // --- Arrange ---
    useAuth.mockReturnValue([{ user: {} }]);

    // --- Act ---
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // --- Assert ---
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });
});