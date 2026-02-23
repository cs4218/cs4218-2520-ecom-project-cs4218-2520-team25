import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CartPage from "./CartPage";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

jest.mock("react-icons/ai", () => ({
    AiFillWarning: () => null,
}));

jest.mock("braintree-web-drop-in-react", () => ({
  __esModule: true,
  default: ({ onInstance }) => {
    Promise.resolve().then(() => {
      onInstance?.(globalThis.__dropInInstance);
    });
    return <div data-testid="dropin">DropInMock</div>;
  },
}));
describe("CartPage", () => {
    const mockSetAuth = jest.fn();
    const mockSetCart = jest.fn();
    const cartItems = [
    {
        _id: "p1",
        name: "Item A",
        description: "aaaaaaaaaabbbbbbbbbbcccccccccc",
        price: 10,
    },
    {
        _id: "p2",
        name: "Item B",
        description: "ddddddddddeeeeeeeeeeffffffffff",
        price: 20,
    },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        globalThis.__didSetDropInInstance = false;
        globalThis.__dropInInstance = {
            requestPaymentMethod: jest.fn(),
        };
        axios.get.mockResolvedValue({ data: { clientToken: "token_123" } });
        axios.post.mockResolvedValue({ data: { ok: true } });
        useAuth.mockReturnValue([{ token: null, user: null }, mockSetAuth]);
        useCart.mockReturnValue([[], mockSetCart]);
        window.localStorage.setItem.mockClear();
        window.localStorage.getItem.mockClear();
        window.localStorage.removeItem.mockClear();
    });

    // Owen Yeo Le Yang A0252047L
    test("renders guest view with empty cart and fetches token", async () => {
        render(<CartPage />);

        expect(screen.getByText(/hello guest/i)).toBeInTheDocument();
        expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token");
        });
    });

    // Owen Yeo Le Yang A0252047L
    test("renders authenticated greeting and cart count", async () => {
        useAuth.mockReturnValue([
            { token: "token_abc", user: { name: "Bob", address: "123 Street" } },
            mockSetAuth,
        ]);
        useCart.mockReturnValue([cartItems, mockSetCart]);

        render(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        expect(screen.getByText(/hello\s+bob/i)).toBeInTheDocument();
        expect(screen.getByText(/you have 2 items in your cart/i)).toBeInTheDocument();
        expect(screen.getByText(/total\s*:\s*\$30\.00/i)).toBeInTheDocument();
    });

    // Owen Yeo Le Yang A0252047L
    test("renders cart items and removes an item", async () => {
        useAuth.mockReturnValue([
            { token: "token_abc", user: { name: "Bob", address: "123 Street" } },
            mockSetAuth,
        ]);
        useCart.mockReturnValue([cartItems, mockSetCart]);

        render(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        expect(screen.getByText("Item A")).toBeInTheDocument();
        expect(screen.getByText("Item B")).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0]);

        const expectedCart = [cartItems[1]];
        expect(mockSetCart).toHaveBeenCalledWith(expectedCart);
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            "cart",
            JSON.stringify(expectedCart)
        );
    });

    // Owen Yeo Le Yang A0252047L
    test("shows current address and navigates to profile for update", async () => {
        useAuth.mockReturnValue([
            { token: "token_abc", user: { name: "Bob", address: "123 Street" } },
            mockSetAuth,
        ]);
        useCart.mockReturnValue([cartItems, mockSetCart]);

        render(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        expect(screen.getByText(/current address/i)).toBeInTheDocument();
        expect(screen.getByText("123 Street")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /update address/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
    });

    // Owen Yeo Le Yang A0252047L
    test("shows update address button when logged in without address", async () => {
        useAuth.mockReturnValue([
            { token: "token_abc", user: { name: "Bob", address: "" } },
            mockSetAuth,
        ]);
        useCart.mockReturnValue([cartItems, mockSetCart]);

        render(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        fireEvent.click(screen.getByRole("button", { name: /update address/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
    });

    // Owen Yeo Le Yang A0252047L
    test("shows login button and navigates to login with state for guest", async () => {
        useAuth.mockReturnValue([{ token: null, user: null }, mockSetAuth]);
        useCart.mockReturnValue([cartItems, mockSetCart]);

        render(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        fireEvent.click(screen.getByRole("button", { name: /plase login to checkout/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
    });

    // Owen Yeo Le Yang A0252047L
    test("does not render drop-in when token, auth token, or cart is missing", async () => {
        render(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());
        expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();

        useAuth.mockReturnValue([{ token: "token_abc", user: { name: "Bob" } }, mockSetAuth]);
        useCart.mockReturnValue([cartItems, mockSetCart]);
        axios.get.mockResolvedValue({ data: { clientToken: "" } });

        render(<CartPage />);
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });
        expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
    });

    // Owen Yeo Le Yang A0252047L
    test("renders drop-in and completes payment successfully", async () => {
        useAuth.mockReturnValue([
            { token: "token_abc", user: { name: "Bob", address: "123 Street" } },
            mockSetAuth,
        ]);
        useCart.mockReturnValue([cartItems, mockSetCart]);
        globalThis.__dropInInstance.requestPaymentMethod.mockResolvedValue({
            nonce: "nonce_123",
        });

        render(<CartPage />);

        const payBtn = await screen.findByRole("button", { name: /make payment/i });
        await waitFor(() => expect(payBtn).toBeEnabled());

        fireEvent.click(payBtn);

        await waitFor(() => {
            expect(globalThis.__dropInInstance.requestPaymentMethod).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith("/api/v1/product/braintree/payment", {
                nonce: "nonce_123",
                cart: cartItems,
            });
            expect(window.localStorage.removeItem).toHaveBeenCalledWith("cart");
            expect(mockSetCart).toHaveBeenCalledWith([]);
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
            expect(toast.success).toHaveBeenCalledWith("Payment Completed Successfully ");
        });
    });

    // Owen Yeo Le Yang A0252047L
    test("disables payment button when address is missing", async () => {
        useAuth.mockReturnValue([
            { token: "token_abc", user: { name: "Bob", address: "" } },
            mockSetAuth,
        ]);
        useCart.mockReturnValue([cartItems, mockSetCart]);

        render(<CartPage />);
        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        const paymentButton = await screen.findByRole("button", { name: /make payment/i });
        expect(paymentButton).toBeDisabled();
        });

    // Owen Yeo Le Yang A0252047L
    test("handles payment failure and does not clear cart", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        useAuth.mockReturnValue([
            { token: "token_abc", user: { name: "Bob", address: "123 Street" } },
            mockSetAuth,
        ]);
        useCart.mockReturnValue([cartItems, mockSetCart]);

        globalThis.__dropInInstance.requestPaymentMethod.mockRejectedValue(
            new Error("Payment method failed")
        );

        render(<CartPage />);

        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        const payBtn = await screen.findByRole("button", { name: /make payment/i });
        await waitFor(() => expect(payBtn).toBeEnabled());

        fireEvent.click(payBtn);

        await waitFor(() =>
            expect(globalThis.__dropInInstance.requestPaymentMethod).toHaveBeenCalledTimes(1)
        );
        await waitFor(() => expect(consoleSpy).toHaveBeenCalled());

        expect(axios.post).not.toHaveBeenCalled();

        // should not clear cart
        expect(window.localStorage.removeItem).not.toHaveBeenCalledWith("cart");
        expect(mockSetCart).not.toHaveBeenCalledWith([]);

        // should not navigate success page
        expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard/user/orders");

        // should not toast success
        expect(toast.success).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
        });

    // Owen Yeo Le Yang A0252047L
    test("handles token fetch error", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        axios.get.mockRejectedValue(new Error("Token error"));

        render(<CartPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });
});
