"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import PropertyService from "@/services/propertyService"
import { Download, FileText, Table, Search } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { capitalizeFirstLetter, Property } from "@/Models/models"
import { format } from 'date-fns';
import usePropertyStore from "@/stores/propertyStore"


//Add a utility to generate export content
function generateExportContent(format: string, properties: any[], fields: string[]) {
  if (format === "csv" || format === "excel") {
    const header = fields.join(",");
    const rows = properties.map((p) =>
      fields.map((f) => `"${(p[f] ?? "").toString().replace(/"/g, '""')}"`).join(",")
    );
    return [header, ...rows].join("\n");
  }
  if (format === "json") {
    return JSON.stringify(properties.map((p) => {
      const obj: Record<string, any> = {};
      fields.forEach((f) => { obj[f] = p[f]; });
      return obj;
    }), null, 2);
  }
  return "";
}

// Mock function to simulate export
const exportData = async (
  format: string,
  propertyIds: string[],
  fields: string[],
  allProperties: any[]
) => {
  const selectedProps = allProperties.filter((p) => propertyIds.includes(p.id));
  const content = generateExportContent(format, selectedProps, fields);
  let filename = `properties_export.${format}`;
  let mimeType = "text/plain";
  if (format === "csv" || format === "excel") mimeType = "text/csv";
  if (format === "json") mimeType = "application/json";
  downloadFile(content, filename, mimeType);
  return new Promise((resolve) => setTimeout(resolve, 1500));
};
//Add a utility to trigger file download:
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
export default function PropertyExport() {
  const propertyService = new PropertyService();
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
    const [properties, setProperties] = useState<Property[]>([]);
  const {isCacheValid,getAllProperties}=usePropertyStore()
  const [selectedFormat, setSelectedFormat] = useState("csv")
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "address",
    "price",
    "area",
    "type",
    "city",
    "confidenceF",
  ])
  const [isExporting, setIsExporting] = useState(false)
  const [propertyFilter, setPropertyFilter] = useState("all")
  const [propertySearchTerm, setPropertySearchTerm] = useState("")

  useEffect(() => {
    const fetchProperties = async () => {
      if (isCacheValid()) {
        setProperties(getAllProperties());
      } else {
        const res = await propertyService.getProperties();
        setProperties(res);
      }
    };

    fetchProperties();
  }, [isCacheValid, getAllProperties, propertyService]);
  // Available export formats
const exportFormats = [
  { id: "csv", label: "CSV", icon: <FileText className="h-4 w-4" /> },
  { id: "excel", label: "Excel", icon: <Table className="h-4 w-4" /> },
  { id: "json", label: "JSON", icon: <FileText className="h-4 w-4" /> },
]

  // Available fields for export
  const availableFields = [
    { id: "address", label: "Address" },
    { id: "price", label: "Property Value" },
    { id: "area", label: "Square Footage" },
    { id: "type", label: "Property Type" },
    { id: "city", label: "Region" },
    { id: "confidence", label: "Confidence Level" },
    { id: "updatedAt", label: "Last Updated" },
    { id: "views", label: "View Count" },
    
    { id: "ownerType", label: "Owner Type" },
  ]

  // Filter properties based on selection and search
  const filteredProperties = properties.filter((property) => {
    // First apply the confidence filter
    let passesConfidenceFilter = true
    if (propertyFilter === "high") passesConfidenceFilter = property.confidence === "High"
    else if (propertyFilter === "medium") passesConfidenceFilter = property.confidence === "Medium"
    else if (propertyFilter === "low") passesConfidenceFilter = property.confidence === "Low"

    // Then apply the search filter if there's a search term
    const passesSearchFilter =
      propertySearchTerm === "" ||
      property.address.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      property.price.toString().toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
      (property.type as string).toLowerCase().includes(propertySearchTerm.toLowerCase())

    return passesConfidenceFilter && passesSearchFilter
  })

  // Toggle property selection
  const toggleProperty = (propertyId: string) => {
    if (selectedProperties.includes(propertyId)) {
      setSelectedProperties(selectedProperties.filter((id) => id !== propertyId))
    } else {
      setSelectedProperties([...selectedProperties, propertyId])
    }
  }

  // Toggle field selection
  const toggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter((id) => id !== fieldId))
    } else {
      setSelectedFields([...selectedFields, fieldId])
    }
  }

  // Select all properties
  const selectAllProperties = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([])
    } else {
      setSelectedProperties(filteredProperties.map((p) => p.id))
    }
  }

  // Handle export
  const handleExport = async () => {
    if (selectedProperties.length === 0) {
      toast({
        title: "No properties selected",
        description: "Please select at least one property to export.",
        variant: "destructive",
      })
      return
    }

    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select at least one field to export.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)

    try {
      await await exportData(selectedFormat, selectedProperties, selectedFields, filteredProperties);

      // Add to export history
      const historyItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        format: selectedFormat,
        propertyCount: selectedProperties.length,
        fields: selectedFields,
      }

      // In a real app, this would be stored in a database or local storage
      console.log("Adding to export history:", historyItem)

      toast({
        title: "Export successful",
        description: `${selectedProperties.length} properties exported as ${selectedFormat.toUpperCase()}.`,
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Property Selection */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Select Properties</CardTitle>
            <CardDescription>Choose the properties you want to export</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar - Added before the filter options */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search properties by name, location, or value..."
                  className="pl-9 w-full"
                  value={propertySearchTerm}
                  onChange={(e) => setPropertySearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedProperties.length === filteredProperties.length && filteredProperties.length > 0}
                  onCheckedChange={selectAllProperties}
                />
                <Label htmlFor="selectAll">Select All</Label>
              </div>

              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  <SelectItem value="high">High Confidence</SelectItem>
                  <SelectItem value="medium">Medium Confidence</SelectItem>
                  <SelectItem value="low">Low Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md">
              {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 max-h-[400px] overflow-y-auto">
                  {filteredProperties.map((property) => (
                    <div key={property.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={property.id}
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={() => toggleProperty(property.id)}
                      />
                      <div>
                        <Label htmlFor={property.id} className="font-medium">
                          {capitalizeFirstLetter(property.type as string )} in  {property.city}
                        </Label>
                        <p className="text-sm text-gray-500">{property.address}</p>
                        <p className="text-sm text-gray-500">Value: {property.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No properties found matching your search criteria.</p>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              {selectedProperties.length} of {filteredProperties.length} properties selected
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>Configure your export settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Export Format</h3>
                <RadioGroup value={selectedFormat} onValueChange={setSelectedFormat}>
                  {exportFormats.map((format) => (
                    <div key={format.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={format.id} id={`format-${format.id}`} />
                      <Label htmlFor={`format-${format.id}`} className="flex items-center">
                        {format.icon}
                        <span className="ml-2">{format.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-3">Select Fields</h3>
                <div className="space-y-2">
                  {availableFields.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field.id}`}
                        checked={selectedFields.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleExport}
                disabled={isExporting || selectedProperties.length === 0 || selectedFields.length === 0}
              >
                {isExporting ? (
                  <span>Exporting...</span>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Export Preview</CardTitle>
          <CardDescription>Preview of your selected data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectedFields.map((fieldId) => {
                    const field = availableFields.find((f) => f.id === fieldId)
                    return (
                      <th
                        key={fieldId}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field?.label}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProperties
                  .filter((property) => selectedProperties.includes(property.id))
                  .slice(0, 5)
                  .map((property) => (
                    <tr key={property.id}>
                      {selectedFields.map((fieldId) => (
                        <td
                          key={`${property.id}-${fieldId}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {fieldId === 'type' ?
              capitalizeFirstLetter(property[fieldId as keyof typeof property]?.toString() || '') :
              // Add this condition for 'lastUpdated'
              fieldId === 'updatedAt' ?
                (property.updatedAt ? format(new Date(property.updatedAt), 'MMM dd, yyyy') : 'N/A') : // Example format: May 25, 2025
                property[fieldId as keyof typeof property]?.toString()}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {selectedProperties.length > 5 && (
            <div className="mt-2 text-sm text-gray-500 text-center">
              Showing 5 of {selectedProperties.length} selected properties
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}