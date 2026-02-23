import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import SearchInput from "./SearchInput";
import { useSearch } from "../../context/search";

const mockNavigate = jest.fn();
const mockSetValues = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("SearchInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearch.mockReturnValue([{ keyword: "", results: [] }, mockSetValues]);
  });

  // Owen Yeo Le Yang A0252047L
  test("renders search input with current keyword", () => {
    useSearch.mockReturnValue([{ keyword: "phone", results: [] }, mockSetValues]);

    render(<SearchInput />);

    expect(screen.getByRole("searchbox")).toHaveValue("phone");
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  // Owen Yeo Le Yang A0252047L
  test("updates keyword on input change", () => {
    const values = { keyword: "", results: [] };
    useSearch.mockReturnValue([values, mockSetValues]);

    render(<SearchInput />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "laptop" } });

    expect(mockSetValues).toHaveBeenCalledWith({ ...values, keyword: "laptop" });
  });

  // Owen Yeo Le Yang A0252047L
  test("submits search, stores results, and navigates to /search", async () => {
    const values = { keyword: "shoe", results: [] };
    const apiResults = [{ _id: "p1", name: "Running Shoe" }];
    useSearch.mockReturnValue([values, mockSetValues]);
    axios.get.mockResolvedValue({ data: apiResults });

    render(<SearchInput />);

    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/shoe");
      expect(mockSetValues).toHaveBeenCalledWith({ ...values, results: apiResults });
      expect(mockNavigate).toHaveBeenCalledWith("/search");
    });
  });

  // Owen Yeo Le Yang A0252047L
  test("handles search API failure gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const values = { keyword: "shoe", results: [] };
    useSearch.mockReturnValue([values, mockSetValues]);
    axios.get.mockRejectedValue(new Error("Search failed"));

    render(<SearchInput />);
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/shoe");
      expect(consoleSpy).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
