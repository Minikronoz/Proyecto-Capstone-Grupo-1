import fetch from "node-fetch";

export async function obtenerGeoData(direccion) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(direccion + ", Chile")}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "CapstoneSupermercados/1.0"
      }
    });

    const data = await res.json();
    if (!data.length) return null;

    const d = data[0];

    // Obtener detalles administrativos
    const detailsUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${d.lat}&lon=${d.lon}`;
    const details = await (await fetch(detailsUrl)).json();

    return {
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      comuna: details.address.city || details.address.town || details.address.village || null,
      region: details.address.state || null
    };
  } catch (err) {
    console.error("❌ ERROR Nominatim:", err);
    return null;
  }
}
