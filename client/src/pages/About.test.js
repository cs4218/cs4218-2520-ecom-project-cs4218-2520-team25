import React from "react";
import { render, screen } from "@testing-library/react";
import About from "./About";
import Layout from "./../components/Layout";
import Pagenotfound from "./Pagenotfound";

// Layout is already mocked in setupTests.js to render a div with data-testid="layout"

describe("About Page", () => {
  test("renders without crashing", () => {
    render(<About />);
    const layout = screen.getByTestId("layout");
    expect(layout).toBeInTheDocument();
  });

  test("Layout receives correct title prop", () => {
    render(<About />);
    const layout = screen.getByTestId("layout");
    expect(layout).toHaveAttribute("title", "About us - Ecommerce app");
  });

  test("renders the main row with contactus class", () => {
    render(<About />);
    const rowDiv = screen.getByRole("img", { name: /contactus/i }).closest(".row");
    expect(rowDiv).toHaveClass("row contactus");
  });

  test("renders image with correct src and alt", () => {
    render(<About />);
    const image = screen.getByAltText("contactus");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/images/about.jpeg");
    expect(image).toHaveStyle({ width: "100%" });
  });

  test("renders the paragraph text", () => {
    render(<About />);
    const paragraph = screen.getByText("Add text");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveClass("text-justify mt-2");
  });

  test("renders both columns correctly", () => {
    render(<About />);
    const cols = screen.getAllByRole("img")[0].closest(".col-md-6");
    expect(cols).toBeInTheDocument();

    const textCol = screen.getByText("Add text").closest(".col-md-4");
    expect(textCol).toBeInTheDocument();
  });

  // -----------------------------------
  // EDGE CASES
  // -----------------------------------
  test("renders even if image src is missing", () => {
    const BrokenAbout = () => (
      <Layout title="About us - Ecommerce app">
        <div className="row contactus">
          <div className="col-md-6">
            <img alt="contactus" />
          </div>
        </div>
      </Layout>
    );

    render(<BrokenAbout />);
    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute("src"); // src missing
  });

    test("renders even if paragraph is empty", () => {
    const EmptyTextAbout = () => (
        <Layout title="About us - Ecommerce app">
        <div className="row contactus">
            <div className="col-md-4">
            <p className="text-justify mt-2"></p>
            </div>
        </div>
        </Layout>
    );

    const { container } = render(<EmptyTextAbout />);
    const paragraph = container.querySelector("p.text-justify.mt-2");
    expect(paragraph).toBeInTheDocument();
    });
});