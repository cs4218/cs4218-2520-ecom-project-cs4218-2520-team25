import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import HomePage from "./HomePage";
import { CartProvider, useCart } from "../context/cart";

jest.unmock("../context/cart");

jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span>reload</span>,
}));

const CartStateProbe = () => {
  const [cart] = useCart();
  return <span data-testid="cart-size">{cart.length}</span>;
};

describe("HomePage integration (CartContext)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.getItem.mockReturnValue(null);
  });

  // Owen Yeo Le Yang A0252047L
  test("adds product from HomePage into CartContext and persists cart in localStorage", async () => {
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { success: true, total: 1 } });
      }
      if (url === "/api/v1/product/product-list/1") {
        return Promise.resolve({
          data: {
            success: true,
            products: [
              {
                _id: "p1",
                name: "Alpha Phone",
                slug: "alpha-phone",
                description: "Flagship smartphone for daily use",
                price: 999,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <CartProvider>
          <HomePage />
          <CartStateProbe />
        </CartProvider>
      </MemoryRouter>
    );

    await screen.findByText("Alpha Phone");
    expect(screen.getByTestId("cart-size")).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: "ADD TO CART" }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-size")).toHaveTextContent("1");
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "cart",
        expect.stringContaining("Alpha Phone")
      );
    });
  });
});
