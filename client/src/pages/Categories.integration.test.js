import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

// Use real hook (useCategory) but avoid Layout/Header complexity by mocking Layout
jest.mock("../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("axios");

import Categories from "./Categories";

describe("Categories <-> useCategory integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // ensure localStorage minimal used by other hooks won't break
        if (!global.localStorage) global.localStorage = {};
    });

    it("renders category links fetched from API", async () => {
        axios.get.mockResolvedValueOnce({ data: { category: [{ _id: "1", name: "Fish", slug: "fish" }, { _id: "2", name: "Tanks", slug: "tanks" }] } });

        render(
            <MemoryRouter>
                <Categories />
            </MemoryRouter>
        );

        // async fetch; ensure items appear
        const fish = await screen.findByText("Fish");
        const tanks = await screen.findByText("Tanks");

        expect(fish).toBeInTheDocument();
        expect(tanks).toBeInTheDocument();

        // links should point to category routes
        expect(fish.closest("a").getAttribute("href")).toContain("/category/fish");
        expect(tanks.closest("a").getAttribute("href")).toContain("/category/tanks");
    });

    it("renders gracefully when API returns empty list", async () => {
        axios.get.mockResolvedValueOnce({ data: { category: [] } });

        render(
            <MemoryRouter>
                <Categories />
            </MemoryRouter>
        );

        // ensure no category buttons rendered
        const buttons = screen.queryAllByRole("link");
        // there may be other links from mocked layout, ensure none with category slug
        expect(buttons.every((b) => !/category\//.test(b.getAttribute("href") || ""))).toBe(true);
    });
});
