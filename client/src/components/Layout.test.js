jest.unmock('./Layout');

import React from "react";
import { render, screen } from "@testing-library/react";
import Layout from "./Layout";

// Mock Header + Footer to isolate Layout behavior
jest.mock("./Header", () => () => <div data-testid="header" />);
jest.mock("./Footer", () => () => <div data-testid="footer" />);
jest.mock("react-helmet", () => ({
  Helmet: ({ children }) => <>{children}</>,
}));

// Mock Toaster to avoid side effects
jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

describe("Layout Component", () => {

  beforeEach(() => {
    // Reset document head before every test
    document.head.innerHTML = "";
  });

  // ---------------------------
  // BASIC STRUCTURE
  // ---------------------------

  test("renders without crashing", () => {
    render(<Layout />);
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  test("renders children correctly", () => {
    render(
      <Layout>
        <h1>Home Page</h1>
      </Layout>
    );

    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  test("renders even if no children provided", () => {
    render(<Layout />);
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  // ---------------------------
  // TITLE TESTS
  // ---------------------------

  test("uses default title when no title prop is passed", () => {
    render(<Layout />)
    console.log(document.title);
    expect(document.title).toBe("Ecommerce app - shop now");
  });

  test("uses custom title when provided", () => {
    render(<Layout title="Custom Page" />);
    console.log(document.title);
    expect(document.title).toBe("Custom Page");
  });

  test("handles empty string title gracefully", () => {
    render(<Layout title="" />);
    expect(document.title).toBe("");
  });

  // ---------------------------
  // META TAG TESTS (DEFAULTS)
  // ---------------------------

  test("sets default meta description", () => {
    render(<Layout />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toHaveAttribute("content", "mern stack project");
  });

  test("sets default meta keywords", () => {
    render(<Layout />);
    const meta = document.querySelector('meta[name="keywords"]');
    expect(meta).toHaveAttribute("content", "mern,react,node,mongodb");
  });

  test("sets default meta author", () => {
    render(<Layout />);
    const meta = document.querySelector('meta[name="author"]');
    expect(meta).toHaveAttribute("content", "Techinfoyt");
  });

  // ---------------------------
  // META TAG TESTS (CUSTOM)
  // ---------------------------

  test("overrides meta description when provided", () => {
    render(<Layout description="Custom Description" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toHaveAttribute("content", "Custom Description");
  });

  test("overrides meta keywords when provided", () => {
    render(<Layout keywords="react,testing" />);
    const meta = document.querySelector('meta[name="keywords"]');
    expect(meta).toHaveAttribute("content", "react,testing");
  });

  test("overrides meta author when provided", () => {
    render(<Layout author="Daniel" />);
    const meta = document.querySelector('meta[name="author"]');
    expect(meta).toHaveAttribute("content", "Daniel");
  });

  // ---------------------------
  // ROBUSTNESS / EDGE CASES
  // ---------------------------

  test("does not duplicate meta tags on re-render", () => {
    const { rerender } = render(<Layout />);
    rerender(<Layout title="New Title" />);

    const descriptions = document.querySelectorAll(
      'meta[name="description"]'
    );

    expect(descriptions.length).toBe(1);
  });

  test("updates title correctly on re-render", () => {
    const { rerender } = render(<Layout title="First" />);
    expect(document.title).toBe("First");

    rerender(<Layout title="Second" />);
    expect(document.title).toBe("Second");
  });

});