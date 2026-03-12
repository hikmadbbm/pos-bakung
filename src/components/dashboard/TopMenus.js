"use client";
import React from "react";
import { formatIDR } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";

export default function TopMenus({ menus = [], loading = false }) {
  if (loading) {
    return <Card className="animate-pulse h-64 bg-gray-50"></Card>;
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Top Performing Menu Items</CardTitle>
        <CardDescription>Menu items generating the most profit today.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu Name</TableHead>
              <TableHead className="text-right">Qty Sold</TableHead>
              <TableHead className="text-right">Total Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                  No sales yet today.
                </TableCell>
              </TableRow>
            ) : (
              menus.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatIDR(item.profit)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
