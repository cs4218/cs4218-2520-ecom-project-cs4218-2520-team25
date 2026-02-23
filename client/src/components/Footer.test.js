// Daniel Loh, A0252099X

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

describe("Footer Component", () => {
  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

  test("renders footer container", () => {
    renderComponent();

    const footerText = screen.getByText(
      /All Rights Reserved/i
    );
    expect(footerText).toBeInTheDocument();
  });

  test("renders correct copyright text", () => {
    renderComponent();

    expect(
      screen.getByText(
        "All Rights Reserved © TestingComp"
      )
    ).toBeInTheDocument();
  });

  test("renders all navigation links", () => {
    renderComponent();

    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Privacy Policy" })
    ).toBeInTheDocument();
  });

  test("links have correct href values", () => {
    renderComponent();

    expect(screen.getByRole("link", { name: "About" }))
      .toHaveAttribute("href", "/about");

    expect(screen.getByRole("link", { name: "Contact" }))
      .toHaveAttribute("href", "/contact");

    expect(screen.getByRole("link", { name: "Privacy Policy" }))
      .toHaveAttribute("href", "/policy");
  });

  test("renders exactly 3 links", () => {
    renderComponent();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
  });
});

// Generate with AI given specifications of unit test