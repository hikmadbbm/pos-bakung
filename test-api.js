async function check() {
  try {
    const res = await fetch('http://localhost:3000/api/menus?all=true');
    const data = await res.json();
    console.log("Full API Response:", data);
    console.log("Menu count:", data.length);
    if (data.length > 0) {
      console.log("First menu sample:", data[0]);
    }
  } catch (e) {
    console.error("Error fetching menus:", e.message);
  }
}
check();
