import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import Contact from "./Contact";

// Han Tae Won (A0221684E)

jest.mock("react-icons/bi", () => ({
    BiMailSend: () => <span>icons</span>,
    BiPhoneCall: () => <span>icons</span>,
    BiSupport: () => <span>icons</span>,
}));

// Mock Layout so we don't drag in Navbar/contexts/hooks
jest.mock("./../components/Layout", () => {
    return ({ children }) => <div data-testid="layout">{children}</div>;
});

describe("Contact Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders CONTACT US heading", () => {
        const { getByText } = render(<Contact />);
        expect(getByText("CONTACT US")).toBeInTheDocument();
    });

    it("renders contact details (email/phone/support)", () => {
        const { getByText } = render(<Contact />);

        expect(getByText(/help@virtualvault\.com/i)).toBeInTheDocument();
        expect(getByText(/012-3456789/i)).toBeInTheDocument();
        expect(getByText(/1800-0000-0000/i)).toBeInTheDocument();
    });

    it("renders the contact image with correct alt text", () => {
        const { getByAltText } = render(<Contact />);
        const img = getByAltText("contactus");
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
    });
});
