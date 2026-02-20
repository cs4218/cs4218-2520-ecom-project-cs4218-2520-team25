import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Policy from "./Policy";

// Mock Layout so it doesn't pull in navbar/footer/context stuff
jest.mock("./../components/Layout", () => ({ children }) => <div>{children}</div>);

describe("Policy Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the policy image", () => {
    render(<Policy />);
    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });

  it("renders policy text", () => {
    render(<Policy />);
    // there are many, so just check at least one
    expect(screen.getAllByText(/add privacy policy/i).length).toBeGreaterThan(0);
  });
});
