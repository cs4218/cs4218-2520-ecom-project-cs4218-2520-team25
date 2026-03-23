import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Search from "./Search";
import { useSearch } from "../context/search";
import { useCart } from "../context/cart";

describe("Search", () => {
  const mockSetSearch = jest.fn();
  const mockSetCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCart.mockReturnValue([[], mockSetCart]);
  });

  // Owen Yeo Le Yang A0252047L
  test("renders empty state when there are no search results", () => {
    useSearch.mockReturnValue([
      {
        keyword: "laptop",
        results: [],
      },
      mockSetSearch,
    ]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByText("Search Results")).toBeInTheDocument();
    expect(screen.getByText("No Products Found")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add to cart/i })).not.toBeInTheDocument();
  });

  // Owen Yeo Le Yang A0252047L
  test("renders product cards when search results are available", () => {
    const products = [
      {
        _id: "p1",
        name: "Gaming Mouse",
        description: "abcdefghijklmnopqrstuvwxyz1234567890",
        price: 89,
      },
      {
        _id: "p2",
        name: "Mechanical Keyboard",
        description: "compact keyboard",
        price: 129,
      },
    ];

    useSearch.mockReturnValue([
      {
        keyword: "accessories",
        results: products,
      },
      mockSetSearch,
    ]);

    render(
      <MemoryRouter>
        <Search />
      </MemoryRouter>
    );

    expect(screen.getByText("Found 2")).toBeInTheDocument();
    expect(screen.getByText("Gaming Mouse")).toBeInTheDocument();
    expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();

    expect(screen.getByText("abcdefghijklmnopqrstuvwxyz1234...")).toBeInTheDocument();
    expect(screen.getByText("compact keyboard...")).toBeInTheDocument();
    expect(screen.getByText("$ 89")).toBeInTheDocument();
    expect(screen.getByText("$ 129")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
    expect(images[1]).toHaveAttribute("src", "/api/v1/product/product-photo/p2");

    expect(screen.getAllByRole("button", { name: /more details/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /add to cart/i })).toHaveLength(2);
  });
});
