// Header.integration.test.js

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";

jest.unmock("../context/auth");
jest.unmock("../context/cart");
jest.unmock("../hooks/useCategory");

// Mock only non-essential UI dependency
jest.mock("../components/Form/SearchInput", () => () => <div />);

// -----------------------------
// MOCK AXIOS
// -----------------------------
jest.mock("axios");

// -----------------------------
// IMPORTS (after unmock)
// -----------------------------
import Header from "../components/Header";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";

// -----------------------------
// TEST WRAPPER
// -----------------------------
const renderWithProviders = (ui) => {
    return render(
        <MemoryRouter>
            <AuthProvider>
                <CartProvider>{ui}</CartProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

// -----------------------------
// MOCK LOCAL STORAGE
// -----------------------------
beforeAll(() => {
    let store = {};

    const localStorageMock = {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };

    Object.defineProperty(global, "localStorage", {
        value: localStorageMock,
        writable: true,
    });
});

// -----------------------------
// CLEANUP
// -----------------------------
beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

// -----------------------------
// TESTS
// -----------------------------
describe("Header Integration Tests", () => {
    test("shows login and register when not authenticated", () => {
        renderWithProviders(<Header />);
        expect(screen.getByText(/login/i)).toBeInTheDocument();
        expect(screen.getByText(/register/i)).toBeInTheDocument();
    });

    test("shows user name when authenticated", async () => {
        localStorage.setItem(
            "auth",
            JSON.stringify({ user: { name: "Daniel", role: 0 }, token: "123" })
        );

        renderWithProviders(<Header />);

        expect(await screen.findByText("Daniel")).toBeInTheDocument();
    });

    test("shows correct cart count from localStorage", async () => {
        localStorage.setItem("cart", JSON.stringify([1, 2, 3]));

        renderWithProviders(<Header />);

        expect(await screen.findByText("3")).toBeInTheDocument();
    });

    test("renders categories from API", async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                category: [
                    { name: "Fish", slug: "fish" },
                    { name: "Tanks", slug: "tanks" },
                ],
            },
        });

        renderWithProviders(<Header />);

        expect(await screen.findByText("Fish")).toBeInTheDocument();
        expect(await screen.findByText("Tanks")).toBeInTheDocument();
    });

    test("logout clears auth and updates UI", async () => {
        localStorage.setItem(
            "auth",
            JSON.stringify({ user: { name: "Daniel", role: 0 }, token: "123" })
        );

        renderWithProviders(<Header />);

        // open dropdown
        await userEvent.click(await screen.findByText("Daniel"));

        // click logout
        await userEvent.click(screen.getByText(/logout/i));

        expect(localStorage.removeItem).toHaveBeenCalledWith("auth");
    });

    test("handles empty categories gracefully", async () => {
        axios.get.mockResolvedValueOnce({ data: { category: [] } });

        renderWithProviders(<Header />);

        expect(await screen.findByText(/all categories/i)).toBeInTheDocument();
    });

    test("handles category API failure gracefully", async () => {
        axios.get.mockRejectedValueOnce(new Error("API failure"));

        renderWithProviders(<Header />);

        expect(await screen.findByText(/home/i)).toBeInTheDocument();
    });
});