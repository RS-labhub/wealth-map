"use client"

import { useRef, useEffect, useState } from "react"
import * as maptilersdk from "@maptiler/sdk"
import "@maptiler/sdk/dist/maptiler-sdk.css"
import { Property } from "@/Models/models"
import { Skeleton } from "@/components/ui/skeleton"
import { faker } from '@faker-js/faker'

// Proper interface for the Map instance
interface MapRef extends maptilersdk.Map {
  remove: () => void
}

interface MapViewProps {
  properties: Property[]
  initialCenter?: [number, number]
  initialZoom?: number
  coordinates?: [number, number]
}

export default function MapView({
  properties,
  initialCenter = [-95.7129, 37.0902], // Center of US as default
  initialZoom = 3,
  coordinates
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<MapRef | null>(null)
  const markersRef = useRef<maptilersdk.Marker[]>([])
  const isMounted = useRef(false)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Clean up function to remove markers
  const clearMarkers = () => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }

  // Initialize map
  useEffect(() => {
    // Set client-side flag
    setIsClient(true)
    // Set mounted flag
    isMounted.current = true

    // Cleanup function to run on unmount
    return () => {
      isMounted.current = false
      clearMarkers()
      if (mapInstance.current) {
        try {
        mapInstance.current.remove()
        } catch (error) {
          console.error("Error removing map:", error)
        }
        mapInstance.current = null
      }
    }
  }, [])

  // Initialize map
  useEffect(() => {
    // Only run on the client side
    if (!isClient || !mapContainer.current || mapInstance.current) return

    // Create an async function inside useEffect
    async function initializeMap() {
      try {
        const apikey: string = process.env.NEXT_PUBLIC_MAPTILER_API_KEY as string

        if (!apikey) {
          setError("MapTiler API key is missing. Please check your environment variables.")
          setIsLoading(false)
          return
        }

        maptilersdk.config.apiKey = apikey

        // Wait a small amount of time to ensure DOM is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Check again if component is still mounted
        if (!isMounted.current) return

        // Create map instance
        mapInstance.current = new maptilersdk.Map({
          container: mapContainer.current!,
          style: maptilersdk.MapStyle.STREETS,
          center: initialCenter,
          zoom: initialZoom,
        }) as MapRef

        // Wait for the map to load before adding markers
        mapInstance.current.on("load", () => {
          if (!isMounted.current) return
          setIsLoading(false)
          console.log("Map initialized successfully")
        })

        // Handle WebGL context loss
        mapInstance.current.on("webglcontextlost", () => {
          console.warn("WebGL context lost. Attempting to restore...")
          if (mapInstance.current) {
            try {
              mapInstance.current.resize()
            } catch (error) {
              console.error("Error restoring WebGL context:", error)
            }
          }
        })

        // Handle WebGL context restored
        mapInstance.current.on("webglcontextrestored", () => {
          console.log("WebGL context restored")
          if (mapInstance.current) {
            try {
              mapInstance.current.resize()
            } catch (error) {
              console.error("Error after WebGL context restoration:", error)
            }
          }
        })
      } catch (error) {
        console.error("Error initializing map:", error)
        setError("Failed to initialize map. Please try again later.")
        setIsLoading(false)
      }
    }

    // Call the async function
    initializeMap()
  }, [isClient, initialCenter, initialZoom])

  // Add markers when properties change
  useEffect(() => {
    if (!mapInstance.current || !isMounted.current || isLoading) return

    // Clear existing markers
    clearMarkers()

    // Add new markers for each property
    const addMarkers = async () => {
      // If we have coordinates, use them directly
      for (const property of properties) {
        try {
          if (!isMounted.current || !mapInstance.current) break

          // Check if we have coordinates
          if (coordinates && coordinates.length === 2) {
            const [lng, lat] = coordinates

            const marker = new maptilersdk.Marker({ color: "red" }).setLngLat([lng, lat]).addTo(mapInstance.current)

            // Add popup with property info
            const popup = new maptilersdk.Popup({ offset: 25 }).setHTML(`
                <div style="max-width: 200px;">
                  <h3 style="font-weight: bold; margin-bottom: 5px;">${property.type} ${property.city}</h3>
                  <p style="margin-bottom: 5px;">${property.address}</p>
                  <p style="font-weight: bold; color: #10b981;">${property.price}</p>
                  <a href="/app/property/${property.id}" style="color: #3b82f6; text-decoration: underline;">View details</a>
                </div>
              `)

            marker.setPopup(popup)

            // Store marker for cleanup
            markersRef.current.push(marker)
          } else {
            console.warn(`Property ${property.id} has invalid coordinates`)
          }
        } catch (error) {
          console.error(`Failed to add marker for property "${property.address}":`, error)
        }
      }

      // If we have markers, fit the map to show all of them
      if (markersRef.current.length > 0 && mapInstance.current) {
        try {
        // Create a bounds object
        const bounds = new maptilersdk.LngLatBounds()

        // Extend the bounds to include each marker's position
        markersRef.current.forEach((marker) => {
          bounds.extend(marker.getLngLat())
        })

        // Fit the map to the bounds
        mapInstance.current.fitBounds(bounds, {
          padding: 50, // Add some padding around the bounds
          maxZoom: 15, // Don't zoom in too far
        })
        } catch (error) {
          console.error("Error fitting bounds:", error)
        }
      }
    }

    addMarkers()
  }, [properties, isLoading, coordinates])

  // Don't render the map container on the server
  if (!isClient) {
    return <Skeleton className="w-full h-full" />
  }

  // Show error message if there's an error
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
          <div className="text-lg font-medium">Loading map...</div>
        </div>
      )}
      <div ref={mapContainer} className="h-full" />
    </div>
  )
}
