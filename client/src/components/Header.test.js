// Daniel Loh, A0252099X

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import toast from "react-hot-toast";

// --- MOCKS ---

// Mock SearchInput (we are not testing it here)
jest.mock("./Form/SearchInput", () => () => (
  <div data-testid="search-input">Search</div>
));

// Mock toast
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
}));

// Mock hooks
jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../hooks/useCategory", () => jest.fn());

const { useAuth } = require("../context/auth");
const { useCart } = require("../context/cart");
const useCategory = require("../hooks/useCategory");

describe("Header Component", () => {
  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================
  // Base Rendering
  // =============================

  test("renders base navbar elements correctly", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByText("Cart")).toBeInTheDocument();
  });

  // =============================
  // Category Dropdown
  // =============================

  test("renders dynamic category dropdown items", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([
      { slug: "electronics", name: "Electronics" },
      { slug: "clothes", name: "Clothes" },
    ]);

    renderComponent();

    expect(screen.getByText("All Categories")).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Clothes")).toBeInTheDocument();
  });

  test("renders correctly when categories empty", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("All Categories")).toBeInTheDocument();
  });

  // =============================
  // Unauthenticated State
  // =============================

  test("shows Register and Login when unauthenticated", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  test("unauthenticated user does NOT see Dashboard and Logout", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();

    // Positive assertion
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  // =============================
  // Authenticated State
  // =============================

  test("shows user dropdown when authenticated", () => {
    useAuth.mockReturnValue([
      { user: { name: "Daniel", role: 0 } },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("Daniel")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  test("authenticated user does NOT see Register and Login buttons", () => {
    useAuth.mockReturnValue([
      { user: { name: "Daniel", role: 0 } },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.queryByText("Register")).not.toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();

    // Positive assertion (sanity)
    expect(screen.getByText("Daniel")).toBeInTheDocument();
  });

  // =============================
  // Role-Based Rendering
  // =============================

  test("admin role renders admin dashboard link", () => {
    useAuth.mockReturnValue([
      { user: { name: "AdminUser", role: 1 } },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink).toHaveAttribute(
      "href",
      "/dashboard/admin"
    );
  });

  test("admin role does NOT render user dashboard link", () => {
    useAuth.mockReturnValue([
      { user: { name: "Admin", role: 1 } },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    const dashboardLink = screen.getByText("Dashboard");

    expect(dashboardLink).toHaveAttribute("href", "/dashboard/admin");
    expect(dashboardLink).not.toHaveAttribute("href", "/dashboard/user");
  });

  test("normal user role renders user dashboard link", () => {
    useAuth.mockReturnValue([
      { user: { name: "NormalUser", role: 0 } },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    const dashboardLink = screen.getByText("Dashboard");
    expect(dashboardLink).toHaveAttribute(
      "href",
      "/dashboard/user"
    );
  });

  test("normal user does NOT render admin dashboard link", () => {
    useAuth.mockReturnValue([
      { user: { name: "User", role: 0 } },
      jest.fn(),
    ]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    const dashboardLink = screen.getByText("Dashboard");

    expect(dashboardLink).toHaveAttribute("href", "/dashboard/user");
    expect(dashboardLink).not.toHaveAttribute("href", "/dashboard/admin");
  });

  // =============================
  // Logout Behavior
  // =============================

  test("logout clears auth, removes localStorage, and shows toast", () => {
    const mockSetAuth = jest.fn();

    useAuth.mockReturnValue([
      { user: { name: "Daniel", role: 0 }, token: "abc" },
      mockSetAuth,
    ]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    const removeSpy = jest.spyOn(window.localStorage, "removeItem");

    renderComponent();

    fireEvent.click(screen.getByText("Logout"));

    expect(mockSetAuth).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith("auth");
    expect(toast.success).toHaveBeenCalledWith(
      "Logout Successfully"
    );
  });

  // =============================
  // Cart Badge Count
  // =============================

  test("cart badge shows correct count", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[{ id: 1 }, { id: 2 }]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("empty cart shows 0 in badge", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[]]); // empty cart
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  // =============================
  // Edge Cases
  // =============================

  test("handles undefined auth gracefully", () => {
    useAuth.mockReturnValue([undefined, jest.fn()]);
    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  test("handles undefined cart gracefully", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([undefined]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("Cart")).toBeInTheDocument();
  });

  test("undefined cart does not crash and still renders Cart link", () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([undefined]);
    useCategory.mockReturnValue([]);

    renderComponent();

    expect(screen.getByText("Cart")).toBeInTheDocument();
  });

});