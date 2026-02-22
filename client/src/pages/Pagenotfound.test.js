import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import Pagenotfound from "./Pagenotfound";

describe("Pagenotfound Component", () => {
    const renderComponent = () =>
    render(
        <MemoryRouter>
            <Pagenotfound />
        </MemoryRouter>
    );


  test("renders without crashing", () => {
    renderComponent();
    const layout = screen.getByTestId("layout"); // Layout mocked in setupTests.js
    expect(layout).toBeInTheDocument();
  });

  test("Layout receives correct title prop", () => {
    renderComponent();
    const layout = screen.getByTestId("layout");
    expect(layout).toHaveAttribute("title", "go back- page not found");
  });

  test("renders main container with pnf class", () => {
    renderComponent();
    const container = screen.getByText("404").closest(".pnf");
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("pnf");
  });

  test("renders 404 heading with correct text", () => {
    renderComponent();
    const h1 = screen.getByText("404");
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveClass("pnf-title");
  });

  test("renders subheading with correct text", () => {
    renderComponent();
    const h2 = screen.getByText("Oops ! Page Not Found");
    expect(h2).toBeInTheDocument();
    expect(h2).toHaveClass("pnf-heading");
  });

  test("renders Go Back link with correct href and class", () => {
    renderComponent();
    const link = screen.getByRole("link", { name: /Go Back/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveClass("pnf-btn");
  });
});