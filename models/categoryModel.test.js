// Daniel Loh, A0252099X

import Category from "./categoryModel.js"; // adjust path if needed

describe("Category Schema Validation (No DB Connection)", () => {

    it("should validate a correct category", async () => {
        const category = new Category({
            name: "Electronics",
            slug: "electronics",
        });

        await expect(category.validate()).resolves.toBeUndefined();
    });

    it("should fail validation if name is missing", () => {
        const category = new Category({
            slug: "electronics",
        });

        const error = category.validateSync();
        expect(error.errors.name).toBeDefined();
    });

    it("should fail validation if name is null", () => {
        const category = new Category({
            name: null,
        });

        const error = category.validateSync();
        expect(error.errors.name).toBeDefined();
    });

    it("should trim name automatically", async () => {
        const category = new Category({
            name: "   Books   ",
            slug: "books",
        });

        await category.validate();

        expect(category.name).toBe("Books");
    });

    it("should convert slug to lowercase automatically", async () => {
        const category = new Category({
            name: "Toys",
            slug: "TOYS",
        });

        await category.validate();

        expect(category.slug).toBe("toys");
    });

    it("should allow slug to be optional", async () => {
        const category = new Category({
            name: "Furniture",
        });

        await expect(category.validate()).resolves.toBeUndefined();
        expect(category.slug).toBeUndefined();
    });

    it("should allow empty string slug", async () => {
        const category = new Category({
            name: "Games",
            slug: "",
        });

        await category.validate();

        expect(category.slug).toBe("");
    });

});