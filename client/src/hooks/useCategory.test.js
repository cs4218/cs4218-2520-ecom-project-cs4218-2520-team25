import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "../hooks/useCategory";

jest.mock("axios");

describe("useCategory hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches and sets categories correctly", async () => {
    const mockCategories = [
      { _id: "1", name: "Electronics" },
      { _id: "2", name: "Book" },
      { _id: "3", name: "Clothing" }
    ];

    axios.get.mockResolvedValue({
      data: { category: mockCategories },
    });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current.length).toBe(3);
    });

    expect(result.current).toEqual(mockCategories);
    expect(axios.get).toHaveBeenCalledWith(
      "/api/v1/category/get-category"
    );
  });

  test("handles error when get fails", async () => {
    axios.get.mockRejectedValue(new Error("error fetching...r"));

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

  });
});



