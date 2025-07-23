import { mockOwners } from "./mock-data"

export type ConfidenceLevel = "High" | "Medium" | "Low"

export type Property = {
  id: string
  address: string
  coordinates: number[]
  value: string
  region: string
  state?:string
  zipCode?:string
  sqft: number
  views: number
  confidenceLevel: ConfidenceLevel
  lastUpdated: string
  ownerId: string
  ownerName: string
  ownerType: string
  type: string
  trendingScore: number
}

// Generate dates for different time periods
export const generateDate = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Create property types based on address
const getPropertyType = (address: string): string => {
  if (address.toLowerCase().includes("condo")) return "Condo"
  if (address.toLowerCase().includes("beach") || address.toLowerCase().includes("ocean")) return "Beachfront"
  if (address.toLowerCase().includes("lake")) return "Lakefront"
  if (address.toLowerCase().includes("mountain") || address.toLowerCase().includes("ski")) return "Mountain"
  if (address.toLowerCase().includes("downtown") || address.toLowerCase().includes("financial")) return "Urban"

  const types = ["Apartment", "Villa", "Penthouse", "Mansion", "Estate"]
  return types[Math.floor(Math.random() * types.length)]
}

// Generate trending properties with good distribution for filtering
export const generateTrendingProperties = (): Property[] => {
  // First, create base properties from owner data
  const baseProperties = mockOwners.flatMap((owner) =>
    owner.properties.map((property, index) => ({
      id: `${owner.id}-${index}`,
      address: property.address,
      coordinates: property.coordinates,
      value: property.value,
      region: property.address.split(",").pop()?.trim() || "",
      sqft: Math.floor(Math.random() * 3000) + 1000,
      views: 0, // Will be set later
      confidenceLevel: owner.confidenceLevel,
      lastUpdated: "", // Will be set later
      ownerId: owner.id,
      ownerName: owner.name,
      ownerType: owner.type,
      type: getPropertyType(property.address),
      trendingScore: 0, // Will be calculated later
    })),
  )

  // Ensure we have at least 40 properties
  const properties = [...baseProperties]

  // If we need more properties, duplicate some with variations
  while (properties.length < 40) {
    const originalProperty = baseProperties[Math.floor(Math.random() * baseProperties.length)]

    // Create a slightly different location for the duplicate
    const [lng, lat] = originalProperty.coordinates
    const newLng = lng + (Math.random() * 0.02 - 0.01) // Add a small random offset
    const newLat = lat + (Math.random() * 0.02 - 0.01) // Add a small random offset

    const newProperty = {
      ...originalProperty,
      id: `${originalProperty.id}-dup-${properties.length}`,
      sqft: Math.floor(Math.random() * 3000) + 1000,
      coordinates: [newLng, newLat],
      address: originalProperty.address.replace(/\d+/, (match) => {
        // Change the street number slightly
        const num = Number.parseInt(match)
        return (num + Math.floor(Math.random() * 100)).toString()
      }),
    }
    properties.push(newProperty)
  }

  // Now distribute the properties evenly across our filter categories
  return properties.map((property, index) => {
    // Distribute lastUpdated dates
    let lastUpdated
    if (index % 4 === 0) {
      // Last week (25%)
      lastUpdated = generateDate(Math.floor(Math.random() * 7) + 1)
    } else if (index % 4 === 1) {
      // Last month (25%)
      lastUpdated = generateDate(Math.floor(Math.random() * 23) + 8)
    } else if (index % 4 === 2) {
      // Last quarter (25%)
      lastUpdated = generateDate(Math.floor(Math.random() * 60) + 31)
    } else {
      // Older (25%)
      lastUpdated = generateDate(Math.floor(Math.random() * 100) + 91)
    }

    // Distribute view counts
    let views
    if (index % 3 === 0) {
      // High views (33%)
      views = Math.floor(Math.random() * 400) + 501 // 501-900
    } else if (index % 3 === 1) {
      // Medium views (33%)
      views = Math.floor(Math.random() * 201) + 300 // 300-500
    } else {
      // Low views (33%)
      views = Math.floor(Math.random() * 299) + 1 // 1-299
    }

    // Calculate trending score (combination of recency and views)
    const updatedDate = new Date(lastUpdated)
    const now = new Date()
    const daysDiff = Math.max(1, Math.ceil(Math.abs(now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24)))
    const trendingScore = views / daysDiff

    return {
      ...property,
      views,
      lastUpdated,
      trendingScore,
    }
  })
}

// Get the top trending properties
export const getHotProperties = (properties: Property[], count = 4): Property[] => {
  return [...properties].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, count)
}
