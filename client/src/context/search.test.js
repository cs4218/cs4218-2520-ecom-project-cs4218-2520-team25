import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";

jest.unmock("./search");

const TestSearchComponent = () => {
  const [search, setSearch] = useSearch();

  return (
    <div>
      <span data-testid="keyword">{search.keyword || "empty"}</span>
      <span data-testid="results-length">{search.results.length}</span>
      <span data-testid="first-result">{search.results[0]?.name || "none"}</span>
      <button
        onClick={() =>
          setSearch({
            keyword: "mouse",
            results: [{ _id: "r1", name: "Gaming Mouse", price: 99 }],
          })
        }
      >
        Set Search
      </button>
    </div>
  );
};

describe("SearchProvider & useSearch Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should initialize with default search state", () => {
    render(
      <SearchProvider>
        <TestSearchComponent />
      </SearchProvider>
    );

    expect(screen.getByTestId("keyword").textContent).toBe("empty");
    expect(screen.getByTestId("results-length").textContent).toBe("0");
    expect(screen.getByTestId("first-result").textContent).toBe("none");
  });

  test("should update search state via setSearch", () => {
    render(
      <SearchProvider>
        <TestSearchComponent />
      </SearchProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /set search/i }));

    expect(screen.getByTestId("keyword").textContent).toBe("mouse");
    expect(screen.getByTestId("results-length").textContent).toBe("1");
    expect(screen.getByTestId("first-result").textContent).toBe("Gaming Mouse");
  });
});
