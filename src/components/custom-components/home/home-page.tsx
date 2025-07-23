"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import InteractiveMap from "./interactive-map"
import MapFilters from "./map-filters"
import SavedViews from "./saved-views"
import { Button } from "@/components/ui/button"
import { Layers, Filter, Bookmark, X, Grid, Map } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import usePropertyStore from "@/stores/propertyStore"
import useOwnerStore    from "@/stores/ownerStore"

import { toast } from "@/components/ui/use-toast"
import PropertyGrid from "./property-grid"
import type { Property } from "@/Models/models"
import PropertyService from "@/services/propertyService"
import OwnerService from "@/services/onwerService"

export type MapView = {
  id: string
  name: string
  center: [number, number]
  filters: FilterState
  createdAt: string
}

export type FilterState = {
  value: [number, number]
  sqft: [number, number]
  confidence: string[]
  propertyType: string[]
  ownerType: string[]
}

export default function HomePage() {
  const propertyService = new PropertyService();
  const ownerService = new OwnerService();

  const {allProperties, getAllProperties,setAllProperties, isCacheValid: isPropertyCacheValid,}=usePropertyStore()
  const {allOwners, getAllOwners,isCacheValid: isOwnerCacheValid,setAllOwners}=useOwnerStore()

  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");
  const [currentView, setCurrentView] = useState<{ center: [number, number]; zoom: number }>({
    center: [-95.7129, 37.0902],
    zoom: 4,
  });
  const [savedViews, setSavedViews] = useState<MapView[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    value: [0, 15],
    sqft: [0, 999000],
    confidence: ["High", "Medium", "Low"],
    propertyType: [],
    ownerType: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [valueRange, setValueRange] = useState<[number, number]>([0, 0]);
  const [sqftRange, setSqftRange] = useState<[number, number]>([0, 10000]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Check if cache is valid
      if (isPropertyCacheValid() && isOwnerCacheValid()) {
        setProperties(getAllProperties());
        console.log("properties",properties);
        setFilteredProperties(getAllProperties());
        return;
      }
      // Otherwise, fetch from API
      try {
        setIsLoading(true);
        const propertyRes = await propertyService.getProperties();
        const ownerRes = await ownerService.getOwners();
        setAllProperties(propertyRes);
        setAllOwners(ownerRes);
        setProperties(propertyRes);
        setFilteredProperties(propertyRes);
      } catch (err) {
        console.error('Failed to fetch properties:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);


  
  // Get unique property types and owner types
  const propertyTypes = Array.from(new Set(properties.map((p) => p.type)));
  const ownerTypes = Array.from(
    new Set(
      properties
        .map((p) => (p.ownerType == null ? "" : String(p.ownerType)))
        .filter((v) => v !== "")
    )
  );

  // Apply filters to properties
  useEffect(() => {
    const filtered = properties.filter((property) => {
      const passesValue = property.price >= filterState.value[0] && property.price <= filterState.value[1];
      const passesSqft = property.area >= filterState.sqft[0] && property.area <= filterState.sqft[1];
      const passesConfidence = filterState.confidence.length === 0 || filterState.confidence.includes(property.confidence ?? "");
      const passesPropertyType = filterState.propertyType.length === 0 || filterState.propertyType.includes(property.type as string);
      const passesOwnerType = filterState.ownerType.length === 0 || filterState.ownerType.includes(property.ownerType ?? "");
      return passesValue && passesSqft && passesConfidence && passesPropertyType && passesOwnerType;
    });
    setFilteredProperties(filtered);
  }, [filterState, properties]);

  // Calculate ranges for sliders on initial load
  useEffect(() => {
    if (properties.length > 0) {
      const values = properties.map((p) => p.price);
      const minValue = Math.floor(Math.min(...values));
      const maxValue = Math.ceil(Math.max(...values));
      setValueRange([10_000, 8_000_000]);
      setFilterState((prev) => ({ ...prev, value: [minValue, maxValue] }));
      const sqfts = properties.map((p) => p.area);
      const minSqft = Math.floor(Math.min(...sqfts) / 100) * 100;
      const maxSqft = Math.ceil(Math.max(...sqfts) / 100) * 100;
      setSqftRange([minSqft, maxSqft]);
      setFilterState((prev) => ({ ...prev, sqft: [minSqft, maxSqft] }));
    }
  }, [properties]);

  // Load saved views from localStorage
  useEffect(() => {
    const savedViewsFromStorage = localStorage.getItem("savedMapViews")
    if (savedViewsFromStorage) {
      try {
        setSavedViews(JSON.parse(savedViewsFromStorage))
      } catch (error) {
        console.error("Failed to parse saved views:", error)
      }
    }
  }, [])

  // Save current view
  const saveCurrentView = (name: string) => {
    const newView: MapView = {
      id: Date.now().toString(),
      name,
      center: currentView.center,
      filters: { ...filterState },
      createdAt: new Date().toISOString(),
    }

    const updatedViews = [...savedViews, newView]
    setSavedViews(updatedViews)
    localStorage.setItem("savedMapViews", JSON.stringify(updatedViews))

    toast({
      title: "View saved",
      children: `"${name}" has been saved to your views.`,
    })
  }

  // Load a saved view
  const loadSavedView = (view: MapView) => {
    setCurrentView({
      center: view.center,
      zoom: currentView.zoom,
    })
    setFilterState(view.filters)
    setIsSavedViewsOpen(false)

    toast({
      title: "View loaded",
      children: `"${view.name}" has been loaded.`,
    })
  }

  // Delete a saved view
  const deleteSavedView = (id: string) => {
    const updatedViews = savedViews.filter((view) => view.id !== id)
    setSavedViews(updatedViews)
    localStorage.setItem("savedMapViews", JSON.stringify(updatedViews))

    toast({
      title: "View deleted",
      children: "The saved view has been deleted.",
    })
  }

  // Update current view when map moves
  const handleViewChange = (center: [number, number], zoom: number) => {
    setCurrentView({ center, zoom })
  }

  // Toggle map type
  const toggleMapType = () => {
    setMapType(mapType === "streets" ? "satellite" : "streets")
  }

  // Reset filters
  const resetFilters = () => {
    setFilterState({
      value: valueRange,
      sqft: sqftRange,
      confidence: ["High", "Medium", "Low"],
      propertyType: [],
      ownerType: [],
    })

    toast({
      title: "Filters reset",
      children: "All filters have been reset to default values.",
    })
  }

  // Updated toggle view mode function to close panels
  const toggleViewMode = () => {
    setViewMode(viewMode === "map" ? "grid" : "map")
    // Close any open panels when switching views
    setIsFilterOpen(false)
    setIsSavedViewsOpen(false)
  }
  
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

  return (

    <div className="relative h-screen w-full overflow-hidden">
      {/* View Toggle */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-white rounded-md shadow-md p-1 flex">
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            onClick={toggleViewMode}
            className="rounded-r-none"
          >
            <Map className="h-4 w-4 mr-2" />
            Map
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={toggleViewMode}
            className="rounded-l-none"
          >
            <Grid className="h-4 w-4 mr-2" />
            Grid
          </Button>
        </div>
      </div>

      {/* Map Controls - Desktop (Left Side) */}
      {isDesktop && viewMode === "map" && (
        <div className="absolute top-18 left-4 z-10 flex flex-col gap-2">
          <Button variant="secondary" size="sm" onClick={toggleMapType} className="w-36 justify-start">
            <Layers className="h-4 w-4 mr-2" />
            {mapType === "streets" ? "Satellite" : "Streets"}
          </Button>

          <Button
            variant={isFilterOpen ? "default" : "secondary"}
            size="sm"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-36 justify-start"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Button
            variant={isSavedViewsOpen ? "default" : "secondary"}
            size="sm"
            onClick={() => setIsSavedViewsOpen(!isSavedViewsOpen)}
            className="w-36 justify-start"
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Saved Views
          </Button>
        </div>
      )}

      {/* Map View */}
      {viewMode === "map" && (
        <div className="h-full w-full">
          <InteractiveMap
            properties={filteredProperties}
            mapType={mapType}
            initialCenter={currentView.center}
            initialZoom={currentView.zoom}
            onViewChange={handleViewChange}
          />
        </div>
      )}

      {/* Grid View with filter props */}
      {viewMode === "grid" && (
        <div className="h-full overflow-y-auto">
          <PropertyGrid
            properties={filteredProperties}
            filterState={filterState}
            setFilterState={setFilterState}
            valueRange={valueRange}
            sqftRange={sqftRange}
            propertyTypes={propertyTypes}
            ownerTypes={ownerTypes}
            resetFilters={resetFilters}
            totalCount={properties.length}
          />
        </div>
      )}


      {/* Map Controls - Mobile */}
      {!isDesktop && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <div className="h-full overflow-y-auto pb-8">
                <MapFilters
                  filterState={filterState}
                  setFilterState={setFilterState}
                  valueRange={valueRange}
                  sqftRange={sqftRange}
                  propertyTypes={propertyTypes}
                  ownerTypes={ownerTypes}
                  resetFilters={resetFilters}
                  totalCount={properties.length}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="secondary">
                <Bookmark className="h-4 w-4 mr-2" />
                Views
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <div className="h-full overflow-y-auto pb-8">
                <SavedViews
                  views={savedViews}
                  onLoadView={loadSavedView}
                  onDeleteView={deleteSavedView}
                  onSaveCurrentView={saveCurrentView}
                  currentView={currentView}
                />
              </div>
            </SheetContent>
          </Sheet>

          {viewMode === "map" && (
            <Button size="sm" variant="secondary" onClick={toggleMapType}>
              <Layers className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Filters Panel - Desktop */}
      {isDesktop && isFilterOpen && (
        <div className="absolute top-16 left-44 z-10 w-80 bg-white rounded-lg shadow-lg p-4 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsFilterOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <MapFilters
            filterState={filterState}
            setFilterState={setFilterState}
            valueRange={valueRange}
            sqftRange={sqftRange}
            propertyTypes={propertyTypes}
            ownerTypes={ownerTypes}
            resetFilters={resetFilters}
            totalCount={properties.length}
          />
        </div>
      )}

      {/* Saved Views Panel - Desktop */}
      {isDesktop && isSavedViewsOpen && (
        <div className="absolute top-16 left-44 z-10 w-80 bg-white rounded-lg shadow-lg p-4 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Saved Views</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsSavedViewsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SavedViews
            views={savedViews}
            onLoadView={loadSavedView}
            onDeleteView={deleteSavedView}
            onSaveCurrentView={saveCurrentView}
            currentView={currentView}
          />
        </div>
      )}

      {/* Property Count Indicator */}
      {viewMode === "map" && (
        <div className="absolute bottom-4 left-4 z-10 bg-white bg-opacity-90 rounded-md px-3 py-1 text-sm shadow-md">
          Showing {filteredProperties.length} of {properties.length} properties
        </div>
      )}
    </div>
  )
}
