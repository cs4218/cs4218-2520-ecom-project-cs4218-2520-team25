import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Search from "./Search";
import { SearchProvider, useSearch } from "../context/search";

jest.unmock("../context/search");

const SearchSeeder = () => {
  const [, setSearch] = useSearch();

  return (
    <button
      onClick={() =>
        setSearch({
          keyword: "alpha",
          results: [
            {
              _id: "p1",
              name: "Alpha Phone",
              description: "Flagship smartphone for productivity users",
              price: 999,
            },
            {
              _id: "p2",
              name: "Alpha Case",
              description: "Protective case",
              price: 39,
            },
          ],
        })
      }
    >
      Seed Search
    </button>
  );
};

describe("Search page integration (SearchContext)", () => {
  // Owen Yeo Le Yang A0252047L
  test("renders empty state with default search context values", () => {
    render(
      <MemoryRouter>
        <SearchProvider>
          <Search />
        </SearchProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Search Resuts")).toBeInTheDocument();
    expect(screen.getByText("No Products Found")).toBeInTheDocument();
  });

  // Owen Yeo Le Yang A0252047L
  test("renders results when shared search context is updated", () => {
    render(
      <MemoryRouter>
        <SearchProvider>
          <SearchSeeder />
          <Search />
        </SearchProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /seed search/i }));

    expect(screen.getByText("Found 2")).toBeInTheDocument();
    expect(screen.getByText("Alpha Phone")).toBeInTheDocument();
    expect(screen.getByText("Alpha Case")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /add to cart/i })).toHaveLength(2);
  });
});

