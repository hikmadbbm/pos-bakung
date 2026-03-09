import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OrdersPage from "../../app/(dashboard)/orders/page";
import { api } from "../../lib/api";
import { useFocusMode } from "../../lib/focus-mode-context";
import { useToast } from "../../components/ui/use-toast";
import { formatIDR } from "../../lib/format";

// Mock dependencies
jest.mock("../../lib/api");
jest.mock("../../lib/focus-mode-context");
jest.mock("../../components/ui/use-toast");
jest.mock("../../lib/format", () => ({
    formatIDR: jest.fn(val => `Rp ${val}`),
}));
jest.mock("../../components/receipt-preview", () => ({
  ReceiptPreview: () => null,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe("OrdersPage Item Card", () => {
  const mockMenus = [
    { id: 1, name: "Nasi Goreng", price: 25000, categoryId: "cat1", category: { name: "Foods", color: "#ff0000" } }
  ];
  const mockCategories = [{ id: "cat1", name: "Foods", color: "#ff0000" }];
  const mockPlatforms = [{ id: 1, name: "Take Away", type: "OFFLINE" }];
  const mockPendingOrders = [
    {
      id: 99,
      order_number: "TRX-0001",
      date: new Date("2026-03-09T13:00:00.000Z").toISOString(),
      total: 28000,
      status: "PENDING",
      platform_id: 1,
      platform: { id: 1, name: "Take Away" },
      orderItems: [
        { id: 1, menu_id: 1, qty: 1, price: 28000, menu: { id: 1, name: "Nasi Goreng" } }
      ]
    }
  ];

  beforeEach(() => {
    useFocusMode.mockReturnValue({ isFocusMode: false, setIsFocusMode: jest.fn() });
    useToast.mockReturnValue({ success: jest.fn(), error: jest.fn() });
    
    // Mock API responses
    api.get.mockImplementation((url) => {
      if (url === "/menus") return Promise.resolve(mockMenus);
      if (url === "/categories") return Promise.resolve(mockCategories);
      if (url === "/platforms") return Promise.resolve(mockPlatforms);
      if (url === "/orders/pending") return Promise.resolve(mockPendingOrders);
      return Promise.resolve([]);
    });

    api.patch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  test("does not render category name in menu item card", async () => {
    const { findByText } = render(<OrdersPage />);
    const menuItem = await findByText("Nasi Goreng");
    expect(menuItem).toBeInTheDocument();
    
    // Check for category
    const foodsElements = await screen.findAllByText("Foods");
    expect(foodsElements).toHaveLength(1); // Only in tab
  });

  test("does not render price in menu item card", async () => {
    render(<OrdersPage />);
    
    // Wait for item
    await screen.findByText("Nasi Goreng");
    
    // Check for price
    // formatIDR mock returns "Rp 25000"
    // We expect it NOT to be in the document
    const priceText = screen.queryByText("Rp 25000");
    expect(priceText).not.toBeInTheDocument();
  });

  test("can cancel a pending order via PIN flow", async () => {
    render(<OrdersPage />);

    const pendingButton = await screen.findByRole("button", { name: /pending/i });
    fireEvent.click(pendingButton);

    await screen.findByText("TRX-0001");

    const cancelBtn = await screen.findByLabelText("Cancel TRX-0001");
    fireEvent.click(cancelBtn);

    await screen.findByText("Cancel Pending Order");

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await screen.findByText("Authorize Cancel Order");

    fireEvent.change(screen.getByPlaceholderText("Enter PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/orders/99/status", {
        status: "CANCELLED",
        pin: "1234",
      });
    });
  });
});
