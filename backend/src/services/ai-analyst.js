
// Simple heuristic-based AI analyst
export function analyzeBusinessData(todayStats, yesterdayStats, topItems, lowStockItems) {
  const insights = [];

  // 1. Revenue Analysis
  const revenueChange = yesterdayStats.revenue > 0 
    ? ((todayStats.revenue - yesterdayStats.revenue) / yesterdayStats.revenue) * 100 
    : 100;
  
  if (todayStats.revenue > yesterdayStats.revenue) {
    insights.push({
      type: "positive",
      title: "Revenue Growth",
      message: `Great job! Sales are up ${revenueChange.toFixed(1)}% compared to yesterday.`
    });
  } else if (todayStats.revenue < yesterdayStats.revenue) {
    insights.push({
      type: "negative",
      title: "Revenue Dip",
      message: `Sales are down ${Math.abs(revenueChange).toFixed(1)}% from yesterday. Consider running a flash promotion.`
    });
  }

  // 2. Product Performance
  if (topItems.length > 0) {
    const starProduct = topItems[0];
    insights.push({
      type: "info",
      title: "Star Product",
      message: `"${starProduct.name}" is your best seller today with ${starProduct.qty} orders. Make sure you have enough stock for tomorrow!`
    });
  }

  // 3. Profitability Check
  if (todayStats.netProfit < 0) {
    insights.push({
      type: "warning",
      title: "Profit Alert",
      message: "You are currently operating at a loss today. Check your daily fixed costs and operational expenses."
    });
  } else if (todayStats.netProfit > 0 && todayStats.netProfit < 100000) {
    insights.push({
      type: "neutral",
      title: "Modest Profit",
      message: "You're in the green, but profit margins are tight. Try upselling high-margin add-ons like drinks."
    });
  } else {
    insights.push({
      type: "positive",
      title: "Healthy Profit",
      message: "Strong profitability today! Your strategy is working well."
    });
  }

  // 4. Time-based (Mock for now as we don't have hourly data in summary yet)
  const currentHour = new Date().getHours();
  if (currentHour >= 11 && currentHour <= 13) {
    insights.push({
      type: "action",
      title: "Lunch Rush",
      message: "It's peak lunch time. Ensure kitchen staff is ready for high volume."
    });
  }

  return insights;
}
