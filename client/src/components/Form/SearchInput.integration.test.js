import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import SearchInput from "./SearchInput";
import { SearchProvider, useSearch } from "../../context/search";

jest.unmock("../../context/search");

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

const SearchStateProbe = () => {
  const [search] = useSearch();
  return (
    <>
      <span data-testid="keyword">{search.keyword}</span>
      <span data-testid="result-count">{search.results.length}</span>
    </>
  );
};

describe("SearchInput integration (SearchContext + navigation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Owen Yeo Le Yang A0252047L
  test("submits keyword, stores results in SearchContext, and navigates to /search", async () => {
    axios.get.mockResolvedValue({
      data: [{ _id: "p1", name: "Alpha Phone" }],
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <SearchProvider>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <SearchInput />
                  <LocationProbe />
                  <SearchStateProbe />
                </>
              }
            />
            <Route
              path="/search"
              element={
                <>
                  <SearchInput />
                  <LocationProbe />
                  <SearchStateProbe />
                </>
              }
            />
          </Routes>
        </SearchProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "alpha" },
    });
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/alpha");
      expect(screen.getByTestId("location")).toHaveTextContent("/search");
      expect(screen.getByTestId("keyword")).toHaveTextContent("alpha");
      expect(screen.getByTestId("result-count")).toHaveTextContent("1");
    });
  });
});

