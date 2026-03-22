import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ProductDetails from "./ProductDetails";
import axios from "axios";

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

describe("ProductDetails", () => {
  const productPayload = {
    _id: "p1",
    name: "Main Product",
    description: "Main description",
    price: 120,
    category: { _id: "c1", name: "Electronics" },
  };

  const relatedPayload = [
    {
      _id: "p2",
      name: "Related 1",
      slug: "related-1",
      description: "related-1-description-abcdefghijklmnopqrstuvwxyz-0123456789",
      price: 80,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ slug: "main-product" });
  });

  // Owen Yeo Le Yang A0252047L
  test("fetches product details and then fetches related products", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { product: productPayload } })
      .mockResolvedValueOnce({ data: { products: relatedPayload } });

    render(<ProductDetails />);

    expect(await screen.findByText(/name\s*:\s*main product/i)).toBeInTheDocument();
    expect(screen.getByText("Related 1")).toBeInTheDocument();

    expect(axios.get).toHaveBeenNthCalledWith(
      1,
      "/api/v1/product/get-product/main-product"
    );
    expect(axios.get).toHaveBeenNthCalledWith(
      2,
      "/api/v1/product/related-product/p1/c1"
    );
  });

  // Owen Yeo Le Yang A0252047L
  test("does not fetch product when slug is missing", async () => {
    mockUseParams.mockReturnValue({});
    render(<ProductDetails />);

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  // Owen Yeo Le Yang A0252047L
  test("shows empty-state message when there are no related products", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { product: productPayload } })
      .mockResolvedValueOnce({ data: { products: [] } });

    render(<ProductDetails />);

    expect(await screen.findByText(/no similar products found/i)).toBeInTheDocument();
  });

  // Owen Yeo Le Yang A0252047L
  test("navigates to related product details when More Details is clicked", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { product: productPayload } })
      .mockResolvedValueOnce({ data: { products: relatedPayload } });

    render(<ProductDetails />);
    fireEvent.click(await screen.findByRole("button", { name: /more details/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/product/related-1");
  });

  // Owen Yeo Le Yang A0252047L
  test("handles product API failure gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("failed to fetch product"));

    render(<ProductDetails />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
      expect(screen.getByText("Product Details")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
