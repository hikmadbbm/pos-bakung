"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { Plus, Trash2, Edit2, Settings, Sparkles } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";

export default function MenuPage() {
  const { success, error } = useToast();
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Menu Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", cost: "", categoryId: "", prices: {} });
  const [isEditing, setIsEditing] = useState(null);

  // Category Dialog State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: "", color: "#cccccc" });
  const [isCategoryEditing, setIsCategoryEditing] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, c, p] = await Promise.all([
        api.get("/menus"),
        api.get("/categories"),
        api.get("/platforms")
      ]);
      setMenus(m);
      setCategories(c);
      setPlatforms(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Menu Handlers ---

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/menus/${isEditing}`, formData);
      } else {
        await api.post("/menus", formData);
      }
      setIsDialogOpen(false);
      resetMenuForm();
      loadData();
      success(isEditing ? "Menu updated successfully" : "Menu added successfully");
    } catch (e) {
      console.error(e);
      error("Failed to save menu");
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!confirm("Delete menu item?")) return;
    try {
      await api.delete(`/menus/${id}`);
      loadData();
      success("Menu deleted");
    } catch (e) {
      console.error(e);
      error("Failed to delete menu");
    }
  };

  const openEditMenu = (menu) => {
    setFormData({ 
      name: menu.name, 
      price: menu.price, 
      cost: menu.cost, 
      categoryId: menu.categoryId || "",
      prices: menu.prices || {}
    });
    setIsEditing(menu.id);
    setIsDialogOpen(true);
  };

  const openCreateMenu = () => {
    resetMenuForm();
    setIsDialogOpen(true);
  };

  const resetMenuForm = () => {
    setFormData({ name: "", price: "", cost: "", categoryId: "", prices: {} });
    setIsEditing(null);
  };

  const handlePlatformPriceChange = (platformId, val) => {
    setFormData(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [platformId]: val
      }
    }));
  };

  const generateAIPrice = async () => {
    if (formData.price === "" || formData.cost === "") {
      error("Please fill in Base Price and Cost (HPP) first.");
      return;
    }
    try {
      const res = await api.post("/analytics/price-recommendation", {
        basePrice: parseInt(formData.price) || 0,
        cost: parseInt(formData.cost) || 0
      });
      setFormData(prev => ({
        ...prev,
        prices: {
          ...prev.prices,
          ...res.recommendations
        }
      }));
      success("AI recommendations generated!");
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "Failed to generate AI recommendations";
      error(msg);
    }
  };

  // --- Category Handlers ---

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (isCategoryEditing) {
        await api.put(`/categories/${isCategoryEditing}`, categoryFormData);
      } else {
        await api.post("/categories", categoryFormData);
      }
      resetCategoryForm();
      loadData();
      success(isCategoryEditing ? "Category updated" : "Category added");
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "Failed to save category";
      error(msg);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Delete category? This might affect menu items.")) return;
    try {
      await api.delete(`/categories/${id}`);
      loadData();
      success("Category deleted");
    } catch (e) {
      console.error(e);
      error("Failed to delete category");
    }
  };

  const openEditCategory = (cat) => {
    setCategoryFormData({ name: cat.name, color: cat.color });
    setIsCategoryEditing(cat.id);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: "", color: "#cccccc" });
    setIsCategoryEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Master Menu</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" /> Manage Categories
          </Button>
          <Button onClick={openCreateMenu}>
            <Plus className="w-4 h-4 mr-2" /> Add Menu
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Platform Prices</TableHead>
              <TableHead>Cost (HPP)</TableHead>
              <TableHead>Profit/Portion</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : menus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No menus found.</TableCell>
              </TableRow>
            ) : (
              menus.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>
                    {m.category ? (
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: m.category.color }}
                      >
                        {m.category.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">Uncategorized</span>
                    )}
                  </TableCell>
                  <TableCell>{formatIDR(m.price)}</TableCell>
                  <TableCell>
                    {platforms.length === 0 ? (
                      <span className="text-gray-400 text-[10px] italic">No platforms</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {platforms.map(p => (
                          <div key={p.id} className="px-1.5 py-0.5 rounded bg-gray-100 border text-[10px] flex items-center">
                            <span className="font-semibold mr-1">{p.name}:</span>
                            <span>{m.prices && m.prices[p.id] ? formatIDR(m.prices[p.id]) : "-"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatIDR(m.cost)}</TableCell>
                  <TableCell className="text-green-600 font-semibold">
                    {formatIDR(m.profit)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditMenu(m)}>
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteMenu(m.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Menu Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Menu" : "Add New Menu"}</DialogTitle>
          </DialogHeader>
        <form onSubmit={handleMenuSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label>Menu Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Mie Ayam Bakso"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              options={[
                { value: "", label: "Select Category..." },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Price (Default)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                placeholder="15000"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost (HPP)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                required
                placeholder="8000"
              />
            </div>
          </div>

          {/* Platform Pricing Section */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Platform Pricing</Label>
              {platforms.length > 0 && (
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  onClick={generateAIPrice}
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Auto AI Price
                </Button>
              )}
            </div>
            {platforms.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-dashed rounded text-center text-xs text-gray-500">
                No platforms configured. Please go to Platform Management to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {platforms.map(p => (
                  <div key={p.id} className="space-y-1">
                    <Label className="text-xs text-gray-500">{p.name}</Label>
                    <Input
                      type="number"
                      value={formData.prices[p.id] || ""}
                      onChange={(e) => handlePlatformPriceChange(p.id, e.target.value)}
                      placeholder={formData.price} // hint base price
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 mt-4 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
        <div className="space-y-6">
          {/* Add/Edit Form */}
          <form onSubmit={handleCategorySubmit} className="p-4 bg-gray-50 rounded-md border space-y-4">
            <h3 className="font-medium text-sm">{isCategoryEditing ? "Edit Category" : "Add New Category"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input 
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                  placeholder="Category Name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <div className="flex items-center h-9">
                  <input 
                    type="color" 
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="h-9 w-12 cursor-pointer border rounded"
                    title="Pick a color"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="h-9">
                {isCategoryEditing ? "Update" : "Add"}
              </Button>
            </div>
            {isCategoryEditing && (
              <div className="flex justify-end">
                 <Button type="button" variant="ghost" size="sm" onClick={resetCategoryForm} className="text-xs h-6">
                   Cancel Edit
                 </Button>
              </div>
            )}
          </form>

          {/* List */}
          <div className="max-h-60 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-gray-500">No categories yet.</TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: cat.color }}></div>
                      </TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCategory(cat)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Close
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
