import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Products from "./Products";

// mock Layout + AdminMenu to keep test focused
jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));
jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">AdminMenu</div>
));

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe("Admin Products page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_API = "";
  });

  test("fetches products on mount and renders cards + links", async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        success: true,
        products: [
          {
            _id: "p1",
            name: "iPhone",
            description: "Nice phone",
            price: 999,
            slug: "iphone",
          },
          {
            _id: "p2",
            name: "MacBook",
            description: "Nice laptop",
            price: 1999,
            slug: "macbook",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product")
    );

    // product titles rendered
    expect(await screen.findByText("iPhone")).toBeInTheDocument();
    expect(screen.getByText("MacBook")).toBeInTheDocument();

    // the <a> wraps the whole card, so accessible name includes multiple texts
    const iphoneLink = screen.getByRole("link", { name: /iphone/i });
    expect(iphoneLink).toHaveAttribute("href", "/dashboard/admin/product/iphone");

    const macLink = screen.getByRole("link", { name: /macbook/i });
    expect(macLink).toHaveAttribute("href", "/dashboard/admin/product/macbook");

    // image src includes product id
    const iphoneImg = screen.getByAltText("iPhone");
    expect(iphoneImg.getAttribute("src")).toContain(
      "/api/v1/product/product-photo/p1"
    );
  });

  // IMPORTANT: Products page UI (as in your DOM dump) has no Delete button.
  // Keep this skipped unless your actual Products.js renders a Delete button.
  test.skip("clicking Delete calls delete endpoint and refreshes list", async () => {});
});