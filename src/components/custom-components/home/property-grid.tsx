"use client"

import { useEffect, useState, useMemo, useRef } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MapPin, Eye, Calendar, Shield, Grid3X3, List, Heart, Filter, X, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import type { Property } from "@/Models/models"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addBookmark, removeBookmark, getBookmarks } from "@/services/bookmarkService"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import MapFilters from "./map-filters"
import PropertyImageCarousel from "./property-image-carousel"
import type { FilterState } from "./home-page"
import { useSession, signOut } from "next-auth/react"
import PropertyService from "@/services/propertyService";
import PropertyStore from "@/stores/propertyStore"
import { User, formatKMB } from "@/Models/models"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Session } from "inspector/promises"

interface PropertyGridProps {
  properties: Property[]
  filterState: FilterState
  setFilterState: (state: FilterState) => void
  valueRange: [number, number]
  sqftRange: [number, number]
  propertyTypes: (string|undefined)[]
  ownerTypes: string[]
  resetFilters: () => void
  totalCount: number
}


export default function PropertyGrid({
  properties,
  filterState,
  setFilterState,
  valueRange,
  sqftRange,
  propertyTypes,
  ownerTypes,
  resetFilters,
  totalCount,
}: PropertyGridProps) {
  const propertyService = new PropertyService()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [bookmarkedPropertyIds, setBookmarkedPropertyIds] = useState<string[]>([])
  const {
    allProperties,
    setAllProperties,
    getAllProperties,
    getPropertyById,}=PropertyStore()
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<string>("value-desc")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [user,setUser]=useState<User|null>(null)
  
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const itemsPerPage = 12
  const {data }=useSession()
  const [isMobile, setIsMobile] = useState(false)
  const [mobilePage, setMobilePage] = useState(1)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
  if (data) {
    setUser(data?.user);
  }
}, [data]);

useEffect(() => {
  if (!userId) return;
  getBookmarks(userId).then((propertyIds) => {
    setBookmarkedPropertyIds(propertyIds)
  })
}, [userId])

  const onSearch = async (query: string) =>  {
    const data=await propertyService.getPropertiesByQuery(query)
    setAllProperties(data)
  }

  // Helper to get region from address (fallback to state if not present)
  const getRegion = (property: Property) => {
    if (property.address && property.address.includes(",")) {
      const parts = property.address.split(",")
      return parts[parts.length - 1].trim()
    }
    return property.state || ""
  }

  // Toggle bookmark for a property
  const toggleBookmark = async (propertyId: string) => {
    if (!userId) return;
    if (bookmarkedPropertyIds.includes(propertyId)) {
      const updated = await removeBookmark(propertyId, userId)
      setBookmarkedPropertyIds(updated)
    } else {
      const updated = await addBookmark(propertyId, userId)
      setBookmarkedPropertyIds(updated)
    }
  }

const filteredProperties = useMemo(() => {
  const query = searchQuery.trim().toLowerCase();

  return properties
    .map((property) => {
      let score = 0;

      if (property.name?.toLowerCase().includes(query)) score += 3;
      if (property.address.toLowerCase().includes(query)) score += 2;
      if (property.state.toLowerCase().includes(query)) score += 1;
      if ((property.type as string).toLowerCase().includes(query)) score += 1;

      return score > 0 ? { ...property, score } : null;
    })
    .filter((p): p is typeof properties[number] & { score: number } => p !== null)
    // If confidence is empty, show none; otherwise, filter by selected
    .filter((p) =>
      filterState.confidence.length === 0
        ? false
        : filterState.confidence.includes((p.confidence ?? "").toString())
    )
    .sort((a, b) => b.score - a.score);
}, [searchQuery, properties, filterState.confidence]);


  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    const getNumericValue = (value: string) => {
      const numericValue = Number.parseFloat(value.replace(/[^0-9.]/g, ""))
      return value.includes("M") ? numericValue * 1000000 : numericValue * 1000
    }

    switch (sortBy) {
      case "value-desc":
        return getNumericValue(b.price.toString()) - getNumericValue(a.price.toString())
      case "value-asc":
        return getNumericValue(a.price.toString()) - getNumericValue(b.price.toString())
      case "sqft-desc":
        return (Number(b.area) || 0) - (Number(a.area) || 0)
      case "sqft-asc":
        return (Number(a.area) || 0) - (Number(b.area) || 0)
      case "views-desc":
        // If views is an array, use its length; if it's a number, use it directly; fallback to 0
        return (typeof b.views === "number" ? b.views : Array.isArray(b.views) ? b.views : 0)
          - (typeof a.views === "number" ? a.views : Array.isArray(a.views) ? a.views : 0)
      case "views-asc":
        return (typeof a.views === "number" ? a.views : Array.isArray(a.views) ? a.views : 0)
          - (typeof b.views === "number" ? b.views : Array.isArray(b.views) ? b.views : 0)
      case "date-desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case "date-asc":
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      default:
        return getNumericValue(b.price.toString()) - getNumericValue(a.price.toString())
    }
  })

  // Paginate properties
  const totalPages = Math.ceil(sortedProperties.length / itemsPerPage)
  const paginatedProperties = sortedProperties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Detect mobile with media query
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 767px)").matches)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Infinite scroll for mobile
  useEffect(() => {
    if (!isMobile) return
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMobilePage((prev) => {
            if (prev < totalPages) return prev + 1
            return prev
          })
        }
      },
      { threshold: 1 }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [isMobile, totalPages])

  // Properties to show (infinite scroll on mobile, paginated on desktop)
  const visibleProperties = isMobile
    ? sortedProperties.slice(0, mobilePage * itemsPerPage)
    : paginatedProperties

  // Get confidence level color
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-green-100 text-green-800 border-green-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Low":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Generate pagination items
  const getPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => setCurrentPage(i)}>
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    return items
  }

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0
    if (filterState.value[0] !== valueRange[0] || filterState.value[1] !== valueRange[1]) count++
    if (filterState.sqft[0] !== sqftRange[0] || filterState.sqft[1] !== sqftRange[1]) count++
    if (filterState.confidence.length !== 3) count++
    if (filterState.propertyType.length > 0) count++
    if (filterState.ownerType.length > 0) count++
    return count
  }

  // Clear individual filter
  const clearFilter = (filterType: string) => {
    switch (filterType) {
      case "value":
        setFilterState({ ...filterState, value: valueRange })
        break
      case "sqft":
        setFilterState({ ...filterState, sqft: sqftRange })
        break
      case "confidence":
        setFilterState({ ...filterState, confidence: ["High", "Medium", "Low"] })
        break
      case "propertyType":
        setFilterState({ ...filterState, propertyType: [] })
        break
      case "ownerType":
        setFilterState({ ...filterState, ownerType: [] })
        break
    }
  }

  const activeFilterCount = getActiveFilterCount()

  // Before passing propertyTypes to MapFilters, ensure 'House' is included
  const allPropertyTypes = Array.from(new Set([...(propertyTypes || []), 'House']));

  return (
    <div className="container mx-auto p-6 pt-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 mt-4">
        <div className="relative w-full md:w-auto flex-1 max-w-md">
          <Input
            placeholder="Search properties by name, address, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(searchQuery)}
            className="pl-10 h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 absolute left-3 top-3.5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

      <div className={`flex items-center gap-3 w-full md:w-auto ${isMobile ? "justify-end " : ""}`}>
       { !isMobile && <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative h-11 border-gray-300 hover:border-green-500">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96">
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-green-600" />
                  Property Filters
                </SheetTitle>
              </SheetHeader>
              <div className="h-full overflow-y-auto pb-8">
                <MapFilters
                  filterState={filterState}
                  setFilterState={setFilterState}
                  valueRange={valueRange}
                  sqftRange={sqftRange}
                  propertyTypes={allPropertyTypes}
                  ownerTypes={ownerTypes}
                  resetFilters={resetFilters}
                  totalCount={totalCount}
                />
              </div>
            </SheetContent>
          </Sheet>}

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] h-11 border-gray-300 focus:border-green-500">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value-desc">Value (High to Low)</SelectItem>
              <SelectItem value="value-asc">Value (Low to High)</SelectItem>
              <SelectItem value="sqft-desc">Size (Large to Small)</SelectItem>
              <SelectItem value="sqft-asc">Size (Small to Large)</SelectItem>
              <SelectItem value="views-desc">Views (High to Low)</SelectItem>
              <SelectItem value="views-asc">Views (Low to High)</SelectItem>
              <SelectItem value="date-desc">Date (Newest First)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
            </SelectContent>
          </Select>

         { !isMobile && <div className="flex bg-gray-100 rounded-md p-1 border border-gray-200">
            <Button
              variant={displayMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode("grid")}
              className="rounded-r-none h-9"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={displayMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode("list")}
              className="rounded-l-none h-9"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>}
        </div>
      </div>

      {/* Active Filters Display */}
      {properties.length > 0 && activeFilterCount > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-green-900">Active Filters ({activeFilterCount})</h4>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-green-600 hover:text-green-800">
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(filterState.value[0] !== valueRange[0] || filterState.value[1] !== valueRange[1]) && (
              <Badge variant="secondary" className="bg-white border border-green-200 text-green-800">
                Value: ${formatKMB(filterState.value[0])} - ${formatKMB(filterState.value[1])}
                <button onClick={() => clearFilter("value")} className="ml-1 hover:text-green-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(filterState.sqft[0] !== sqftRange[0] || filterState.sqft[1] !== sqftRange[1]) && (
              <Badge variant="secondary" className="bg-white border border-green-200 text-green-800">
                Area: {filterState.sqft[0]} - {filterState.sqft[1]} sqft
                <button onClick={() => clearFilter("sqft")} className="ml-1 hover:text-green-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterState.confidence.length !== 3 && (
              <Badge variant="secondary" className="bg-white border border-green-200 text-green-800">
                Confidence: {filterState.confidence.length === 0 ? 'None' : filterState.confidence.join(", ")}
                <button onClick={() => clearFilter("confidence")} className="ml-1 hover:text-green-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filterState.propertyType.map((type) => (
              <Badge key={type} variant="secondary" className="bg-white border border-green-200 text-green-800">
                {type}
                <button
                  onClick={() =>
                    setFilterState({
                      ...filterState,
                      propertyType: filterState.propertyType.filter((t) => t !== type),
                    })
                  }
                  className="ml-1 hover:text-green-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filterState.ownerType.map((type) => (
              <Badge key={type} variant="secondary" className="bg-white border border-green-200 text-green-800">
                {type}
                <button
                  onClick={() =>
                    setFilterState({
                      ...filterState,
                      ownerType: filterState.ownerType.filter((t) => t !== type),
                    })
                  }
                  className="ml-1 hover:text-green-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {visibleProperties.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Grid3X3 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or search query to see more results</p>
          {activeFilterCount > 0 && (
            <Button variant="outline" onClick={resetFilters} className="border-green-200 text-green-600">
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Grid View */}
          {displayMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleProperties.map((property) => (
                <Link href={`/app/employee/property/${property.id}`} key={property.id}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-gray-200 hover:border-green-300 group">
                    <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                      <PropertyImageCarousel propertyId={property.id} className="absolute inset-0" propertyImages={property?.images} />
                      <div className="absolute top-3 right-3">
                        <button
                          type="button"
                          aria-label={bookmarkedPropertyIds.includes(property.id) ? "Remove Bookmark" : "Add Bookmark"}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleBookmark(property.id)
                          }}
                          className="bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              bookmarkedPropertyIds.includes(property.id)
                                ? "text-red-500 fill-red-500"
                                : "text-gray-600"
                            }`}
                            fill={bookmarkedPropertyIds.includes(property.id) ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-green-600 transition-colors">
                        {property.name}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="h-4 w-4 min-w-4 mr-1 text-gray-400" />
                        <span className="text-sm truncate">{property.address}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className="flex items-center gap-1 border-gray-200">
                          <Eye className="h-3 w-3" />
                          {property?.views}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1 border-gray-200">
                          {property?.area != null && !isNaN(Number(property.area))
                            ? `${formatKMB(Number(property.area))} sqft`
                            : "N/A sqft"}
                        </Badge>
                        <Badge className={`${getConfidenceColor(property.confidence ?? "")} flex items-center gap-1`}>
                          <Shield className="h-3 w-3" />
                          {property.confidence}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(property.updatedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <span className="font-bold text-green-600 text-lg">
                            {property?.price != null && !isNaN(Number(property.price))
                              ? `$${formatKMB(Number(property.price))}`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* List View */}
          {displayMode === "list" && (
            <div className="space-y-4">
              {visibleProperties.map((property) => (
                <Link href={`/app/employee/property/${property.id}`} key={property.id}>
                  <Card className="hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-green-300 group">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="h-32 md:w-48 rounded-t-lg md:rounded-l-lg md:rounded-tr-none overflow-hidden relative">
                          <PropertyImageCarousel propertyId={property.id} className="absolute inset-0" />
                        </div>
                        <div className="p-4 flex-1">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg group-hover:text-green-600 transition-colors">
                                {property.name}
                              </h3>
                              <div className="flex items-center text-gray-600 mb-3">
                                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                <span className="text-sm">{property.address}</span>
                              </div>
                            </div>
                            <div className="mt-2 md:mt-0 md:ml-4 flex items-center gap-3">
                              <span className="font-bold text-green-600 text-xl">
                                {property?.price != null && !isNaN(Number(property.price))
                                  ? `$${formatKMB(Number(property.price))}`
                                  : "N/A"}
                              </span>
                              <button
                                type="button"
                                aria-label={
                                  bookmarkedPropertyIds.includes(property.id) ? "Remove Bookmark" : "Add Bookmark"
                                }
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  toggleBookmark(property.id)
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              >
                                <Heart
                                  className={`h-5 w-5 ${
                                    bookmarkedPropertyIds.includes(property.id)
                                      ? "text-red-500 fill-red-500"
                                      : "text-gray-400"
                                  }`}
                                  fill={bookmarkedPropertyIds.includes(property.id) ? "currentColor" : "none"}
                                />
                              </button>
                            
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            <Badge variant="outline" className="flex items-center gap-1 border-gray-200">
                              <Eye className="h-3 w-3" />
                              {property.views} views
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1 border-gray-200">
                              {property?.area != null && !isNaN(Number(property.area))
                                ? `${formatKMB(Number(property.area))} sqft`
                                : "N/A sqft"}
                            </Badge>
                            <Badge
                              className={`${getConfidenceColor(property.confidence ?? "")} flex items-center gap-1`}
                            >
                              <Shield className="h-3 w-3" />
                              {property.confidence} confidence
                            </Badge>
                            <div className="text-sm text-gray-500 flex items-center ml-auto">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(property.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination (desktop only) */}
          {!isMobile && totalPages > 1 && (
            <div className="mt-8 mb-8 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {getPaginationItems()}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Infinite scroll sentinel (mobile only) */}
          {isMobile && visibleProperties.length < sortedProperties.length && (
            <div ref={sentinelRef} className="h-12 flex items-center justify-center text-gray-400">
              Loading more properties...
            </div>
          )}
        </>
      )}
    </div>
  )
}
