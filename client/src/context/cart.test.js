import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

jest.unmock("./cart");

const TestCartComponent = () => {
  const [cart, setCart] = useCart();

  return (
    <div>
      <span data-testid="cart-length">{cart.length}</span>
      <span data-testid="first-item">{cart[0]?.name || "none"}</span>
      <button
        onClick={() =>
          setCart([
            { _id: "p1", name: "Keyboard", price: 100 },
            { _id: "p2", name: "Mouse", price: 50 },
          ])
        }
      >
        Set Cart
      </button>
    </div>
  );
};

describe("CartProvider & useCart Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.getItem.mockReset();
    window.localStorage.getItem.mockReturnValue(null);
  });

  // Owen Yeo Le Yang A0252047L
  test("should initialize with empty cart when localStorage has no cart", () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    );

    expect(screen.getByTestId("cart-length").textContent).toBe("0");
    expect(screen.getByTestId("first-item").textContent).toBe("none");
    expect(window.localStorage.getItem).toHaveBeenCalledWith("cart");
  });

  // Owen Yeo Le Yang A0252047L
  test("should hydrate cart from localStorage on mount", async () => {
    const mockCart = [
      { _id: "c1", name: "Hydrated Item", price: 10 },
      { _id: "c2", name: "Hydrated Item 2", price: 20 },
    ];
    window.localStorage.getItem.mockReturnValueOnce(JSON.stringify(mockCart));

    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("cart-length").textContent).toBe("2");
      expect(screen.getByTestId("first-item").textContent).toBe("Hydrated Item");
    });
  });

  // Owen Yeo Le Yang A0252047L
  test("should update cart via setCart from useCart", async () => {
    render(
      <CartProvider>
        <TestCartComponent />
      </CartProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /set cart/i }));

    await waitFor(() => {
      expect(screen.getByTestId("cart-length").textContent).toBe("2");
      expect(screen.getByTestId("first-item").textContent).toBe("Keyboard");
    });
  });
});
