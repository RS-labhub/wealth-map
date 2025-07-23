// API functions for properties
export async function getProperties() {
  const response = await fetch('/api/property/all', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // This is important for auth
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch properties');
  }
  
  const data = await response.json();
  return {
    allProperties: data.map((property: any) => ({
      id: property.id,
      address: property.address,
      price: property.price,
      area: property.area,
      type: property.type,
      city: property.city,
      confidence: property.confidence || 0
    }))
  };
} 